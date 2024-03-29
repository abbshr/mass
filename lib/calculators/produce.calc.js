module.exports = operators => {
  class ProduceCalculator extends operators.Calculator {
    constructor(env, template) {
      super(env)
      this.template = new Map(Object.entries(template))
    }

    async calc(elem) {
      const record = {}

      for (let [field, fn] of this.template) {
        record[field] = fn(elem)
      }

      await this.product({ ...elem, eventTime: null, record })
    }
  }

  operators.register("ProduceCalculator", ProduceCalculator)
}