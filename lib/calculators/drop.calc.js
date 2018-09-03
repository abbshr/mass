module.exports = operators => {
  class DropCalculator extends operators.Calculator {
    constructor(env, removal) {
      super(env)

      this.removal = removal
    }

    async calc(elem) {
      if (!await this.removal(elem)) {
        this.product(elem)
      }
    }
  }

  operators.register("DropCalculator", DropCalculator)
}