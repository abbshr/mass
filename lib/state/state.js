class State {
  constructor(stateGenerator, cfg) {
    this._result = [];

    this.stateGenerator = stateGenerator;
    this.cfg = cfg;

    // 标识是否可以工作
    this.workable = true;
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

  // 算子就绪时, 调用 internalStateStore 产出聚合结果
  // yield 之后应该销毁聚合器, 并从新创建
  async yield() {
    this.workable = false;
    return this.stash;
  }
}

module.exports = State;