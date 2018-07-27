module.exports = operators => {
  class ProductCalculator extends operators.Calculator {
    constructor(env, sketch) {
      super(env);
      this.sketch = sketch;
    }
  
    async calc(input) {
      let output = {};
      for (let field of Object.keys(this.sketch)) {
        output[field] = this.sketch[field](input);
      }
  
      this.product(output);
    }
  }
  
  operators.register("ProductCalculator", ProductCalculator);
};