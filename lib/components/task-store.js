const config = require("../config");
const getRedis = require("./get-redis");
const syslog = require("../syslog");

// 任务的通用存储层
class TaskStore extends require("./store") {
  constructor(taskId) {
    super(taskId);
    this.cfg = config.taskStoreConfig;

    this.store = getRedis("taskstore", this.cfg);
    this.key = taskId;

    // 本地数据镜像
    this.mirror = null;
    // 远程快照(不可变)
    this.snapshot = null;
    // 相对快照的变更数据
    this.changedData = new Map();

    this.log = syslog.child({ module: `[${this.constructor.name}]` });
  }

  async init() {
    try {
      this.snapshot = await this.getSnapshot();
      this.log.info("Task id: <%s> 初始化状态快照: %o", this.taskId, this.snapshot);
    } catch (err) {
      this.log.error(err, "Task id: <%s> 初始化创建状态快照失败. key: %s", this.taskId, this.key);
    }

    this.mirror = new Map(this.snapshot);
  }

  // 获取最新快照, 同步状态
  async getSnapshot() {
    return new Map(Object.entries(await this.store.hgetall(this.key)));
  }

  checkModified(key, value) {
    return this.snapshot.get(key) !== value;
  }

  // 提交变更, 并清空本地变更.
  async commit() {
    let modified = [];
    let deleted = [];

    for (let [key, entry] of this.changedData) {
      if (!entry) {
        deleted.push(key);
      } else {
        modified.push(key, entry.value);
      }
    }

    const tx = await this.store.multi();

    if (modified.length > 0) {
      tx.hmset(this.key, ...modified);
    }

    if (deleted.length > 0) {
      tx.hdel(this.key, ...deleted);
    }
    
    await tx.exec();
    this.changedData.clear();
  }

  // 回滚状态, 撤销变更, 恢复镜像到快照.
  async rollback() {
    this.mirror = new Map(this.snapshot);
    this.changedData.clear();
  }

  async all() {
    return new Map(this.mirror);
  }

  async get(key) {
    return this.mirror.get(key);
  }

  async set(key, value) {
    if (this.checkModified(key, value)) {
      this.changedData.set(key, { value });
    }

    this.mirror.set(key, value);
  }

  async del(key) {
    this.changedData.set(key, null);
    this.mirror.delete(key);
  }
}

module.exports = TaskStore;