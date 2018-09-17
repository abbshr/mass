module.exports = operators => {
  class DropCalculator extends operators.Calculator {
    constructor(env, removal) {
      super(env)
      this.removal = removal
    }

    async calc(elem) {
      if (!await this.removal(elem)) {
        await this.product(elem)
      } else {
        await this.discard(elem);
      }
    }
  }

  operators.register("DropCalculator", DropCalculator)
}