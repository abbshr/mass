const applog = require("../applog");

class State {
  constructor(stateGenerator) {
    this._result = [];

    this.stateGenerator = stateGenerator;

    // 标识是否可以工作
    this.workable = true;

    this.log = applog.child({ module: `[${this.constructor.name}]` });
  }

  get StateClass() {
    return State;
  }

  // 取得内部状态存储
  get stash() {
    return this._result;
  }

  set stash(store) {
    return this._result = store;
  }

  // 实现聚合算法
  async collect(entry) {
    this.stash.push(entry);
  }

  /**
   * @desc 算子就绪时, 递归的调用内部的 stateStore.yield 产出聚合结果. yield 之后应该销毁聚合器, 并从新创建.
   * @return {Result} yield 结果, 默认为 _resut 递归 yield 的结果或 _result.
   * 
   * example:
   * GroupByStateAggregator
   * 分组状态聚合器, 内部根据组别生成独立的 stateStore. 在 yield 时, 分别递归每个 stateStore.yield 得到结果.
   */
  yield() {
    this.workable = false;

    if (this.stash instanceof State) {
      return this.stash.yield();
    } else {
      return this.stash;
    }
  }
}

module.exports = State;