module.exports = operators => {
  class SelectCalculator extends operators.Calculator {
    constructor(env, selector) {
      super(env)
      this.selector = selector
    }

    async calc(elem) {
      if (await this.selector(elem)) {
        this.product(elem)
      }
    }
  }

  operators.register("SelectCalculator", SelectCalculator)
}