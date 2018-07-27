module.exports = operators => {
  class MutateCalcualtor extends operators.Calculator {
    constructor(env, mutateFn) {
      super(env);
      this.mutateFn = mutateFn;
    }

    async calc(input) {
      let output = await this.mutateFn(input);
      this.product(output);
    }
  }

  operators.register("MutateCalcualtor", MutateCalcualtor);
};