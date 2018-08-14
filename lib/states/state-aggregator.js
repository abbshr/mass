// 状态聚合器
// 适配算子内部的状态存储
class StateAggregator extends require("./state") {
  // constructor(stateGenerator, cfg) {
  //   super()
  //   // this._state = state || this.defaultInMemoryMapState;
  //   // this.SubAggregator = this.StateClass;

  //   // 标识是否可以工作
  //   // this.workable = true;
  // }

  // get StateClass() {
  //   return State;
  // }

  // // 取得内部状态存储
  // get state() {
  //   return this._state;
  // }

  // set state(state) {
  //   return this._state = state;
  // }

  // // 实现聚合算法
  // async collect(elem) {
  //   // this.state.set(elem, );
  // }

  // async spread(intermediateValue) {
  //   if (this.SubAggregator) {
  //     if (!this.childAggregator) {
  //       // TODO: arguments
  //       this.childAggregator = new this.SubAggregator();
  //     }

  //     // 如果存在子聚合器, 则调用子聚合器的 collect 方法
  //     // TODO
  //     await this.childAggregator.collect(this.state);
  //   }
  // }

  // // 算子就绪时被调用产出聚合结果
  // // yield 之后应该销毁聚合器, 并从新创建
  // async yield() {
  //   this.workable = false;
  //   return this.state;
  // }

  // setStateClass(StateAggregatorClass) {
  //   this.SubAggregator = StateAggregatorClass;
  //   return
  // }

  // child aggregator
  // groupBy() {
  //   // return this.setStateClass(GroupByStateAggregator);
  //   return new GroupByStateAggregator();
  // }

}

module.exports = StateAggregator;