module.exports = operators => {
  class SelectCalculator extends operators.Calculator {
    constructor(env, selector) {
      super(env)
      this.selector = selector
    }

    async calc(elem) {
      if (await this.selector(elem)) {
        await this.product(elem)
      } else {
        await this.discard(elem);
      }
    }
  }

  operators.register("SelectCalculator", SelectCalculator)
}