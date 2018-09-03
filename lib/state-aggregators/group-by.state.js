module.exports = states => {
  class GroupByStateAggregator extends states.StateAggregator {
    /**
     * @desc 对元素分组的状态聚合存储
     * @param {Gen} stateGenerator 状态生成器对象
     * @param {... Function | String} assigners 分组器
     * @member {Map} _result 分组状态存放在 Map 里
     * 
     * 如果 assigner 是字符串, 从 elem 里的 record 属性里取值作为组别标识
     * 如果 assigner 是函数, 返回值作为组别标识
     * 
     * @example
     * new GroupByStateAggregator(gen,
     *  "name", "city", "street",
     *  elem => elem.windowTime % 1024
     * )
     * 
     * 以上根据元素的 name, city, street 以及 elem.windowTime % 1024 的值作为分组依据
     * 放到算子内部的桶里, 并用 <{name} \r\n {city} \r\n {street} \r\n {elem.windowTime % 1024}> 序对来标识
     */
    constructor(stateGenerator, ...assigners) {
      super(stateGenerator)

      assigners = assigners.map(assigner => {
        if (typeof assigner === "function") {
          return assigner
        } else {
          return elem => elem.record[assigner]
        }
      })

      this.sep = "\r\n"
      this.assigner = (elem) => assigners.map(assigner => assigner(elem)).join(this.sep)
      this._result = new Map()
    }

    async collect(elem) {
      const gid = this.assigner(elem)
      let groupState = this._result.get(gid)

      if (!groupState) {
        groupState = this.stateGenerator.createStateStore()
        this._result.set(gid, groupState)
      }

      groupState.collect(elem)
    }

    yield() {
      this.workable = false
      return Array.from(this.stash.values()).map(result => result.yield())
    }
  }

  states.register("GroupByStateAggregator", GroupByStateAggregator)
}