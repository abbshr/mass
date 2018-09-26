module.exports = states => {
  class RecordStateAggregator extends states.StateAggregator {
    /**
     * @desc 生成格式化记录的聚合状态存储, 常用于分组之后
     * @param {Gen} stateGenerator 
     * @param {Object} template 生成记录的模板
     * @param {Object} initialRecord  记录的初始状态
     * 
     * @member {Map} _result 记录的状态是 Map
     * 
     * @example
     * new RecordStateAggregator(gen,
     *   {
     *      id(curr, elem) { return curr },
     *      ingestSize(curr, elem) { return curr + elem.record.hasIngest },
     *   },
     *   {
     *      ingestSize: 0
     *   }
     * )
     */
    constructor(stateGenerator, template, initialRecord = {}) {
      super(stateGenerator)

      this.template = new Map(Object.entries(template))
      this._result = new Map(Object.entries(initialRecord))
    }

    // initial(record) {
    //   const state = new Map()
    //   for (let [field, value] of record) {
    //     state.set(field, value)
    //   }

    //   new Map(record)

    //   return state
    // }

    async collect(elem) {
      for (let [field, fn] of this.template) {
        this._result.set(field, fn(this._result.get(field), elem))
      }
    }
  }

  states.register("RecordStateAggregator", RecordStateAggregator)
}