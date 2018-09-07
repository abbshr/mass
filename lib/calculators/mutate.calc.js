module.exports = operators => {
  class MutateCalculator extends operators.Calculator {
    constructor(env, mutFn) {
      super(env)
      this.mutFn = mutFn
    }

    async calc(elem) {
      await this.mutFn(elem)
      elem.modifiedTime = new Date()
      await this.product(elem)
    }
  }

  operators.register("MutateCalculator", MutateCalculator)
}