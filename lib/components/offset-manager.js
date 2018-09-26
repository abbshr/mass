const config = require("../config");
const getRedis = require("./get-redis");
const syslog = require("../syslog");
// const operators = require("../operators");
// const OpMap = require("./op-map");

/**
 * Offset 方案先后设计实现过几种, 但都有问题.
 * 
 * A.
 * 一种方案是每个运算符都可以 commit 和 rollback.
 * 在 offsetmanager 提交 offset 前, 区分 sink 和非 sink 的变更记录.
 * 然后计算两种类型运算符的可达性, 取每组可达运算符之间的最大 offset, 再取这些 offset 之中的最小 offset 提交.
 * 
 * 这种方案是空间换时间的做法, 用 OpMap 类维护一个二维表, 用动态规划的思路预先存储运算符之间的距离, 每次更新流计算拓扑时更新 OpMap.
 * 提交前根据距离即可立即计算运算符的可达性.
 * 
 * 但存在的问题是: 当前导运算符的 offset 大于后置 sink 的 offset' 时, 无法保证 offset - offset' 之间的变量都已经被正确提交, 因此, 无法判断应该取更大一些的 offset 还是 offset'.
 * 
 * B.
 * 另一种方案是现在暂时采用的, 有瑕疵, 但在当前场景下是相对正确的.
 * 每个运算符都需要显式的 "丢弃" 元素, 如果这个元素在不再向下传递, 或不再参与计算.
 * `op.discard(elem)` 方法, 逻辑上通知每个后继运算符不处理这个元素, 而是直接转发.
 * 但物理上还是会接收到这些需要丢弃的数据的. 因此在元素进入之前, 会透明检查是否携带了 discard 标记.
 * 当 discard 元素到达 sink 时, 同样会触发 commit 操作, 保证了每个元素 (无论是否处理) 都能被正确 commit.
 * 
 * 问题是:
 * 1. 为了确保正确使用 commit, 需要 op 设计者清楚知道何时 discard, 并显示在代码中调用.
 * 2. 每个丢弃的元素并没有被真正丢弃, 仍然占用管道资源和正常元素一同被传递.
 * 
 */
class OffsetManager extends require("./store") {
  constructor(taskId) {
    super(taskId);
    this.cfg = config.offsetManagerConfig;
    this.key = taskId;
    this.store = getRedis("offset-store", this.cfg);
    this.topicPartitionMap = new Map();

    // this.opmap = new OpMap();
  }

  async init() {
    this.snapshot = await this.getSnapshot();
    this.mirror = new Map(this.snapshot);
    this.enableAutoCommit();
  }

  async getSnapshot() {
    return new Map(Object.entries(await this.store.hgetall(this.key)));
  }

  async getOffset(topic, partition) {
    const key = `${topic}:${partition}`;
    return this.mirror.get(key);
  }

  async commit() {
    const changeData = [];

    for (const [topicPartition, offsetMap] of this.topicPartitionMap) {
      const minOffset = this.analyzeMinOffset(offsetMap);
      const offset = this.mirror.get(topicPartition);

      if (!offset || minOffset > offset) {
        this.mirror.set(topicPartition, minOffset);
        changeData.push(topicPartition, minOffset);
      }
    }

    if (changeData.length === 0) {
      return;
    }

    syslog.trace("任务 %s 待提交 offset 列表: %o", this.taskId, changeData);
    await this.store.hmset(this.key, ...changeData);
  }

  async update(topicPartition, op, offset) {
    let offsetMap = this.topicPartitionMap.get(topicPartition);

    if (!offsetMap) {
      offsetMap = new Map();
      this.topicPartitionMap.set(topicPartition, offsetMap);
    }

    offsetMap.set(op, offset);
  }

  analyzeMinOffset(offsetMap) {
    return Math.min(...Array.from(offsetMap.values()));
    // const arr = Array.from(offsetMap.keys());
    // const leaves = arr.filter(op => op instanceof operators.Sink);
    // const nonLeaves = arr.filter(op => !(op instanceof operators.Sink));

    // const offsets = leaves.map(leaf => {
    //   const minoffset = offsetMap.get(leaf);
    //   const offsets = nonLeaves
    //   .filter(op => this.opmap.distance(op, leaf))
    //   .map(op => offsetMap.get(op));

    //   const offset = Math.min(...offsets);
    //   return Math.max(minoffset, offset);
    // });

    // return Math.min(...offsets);
  }
}

module.exports = OffsetManager;