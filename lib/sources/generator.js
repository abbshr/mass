const operators = require("../operators");

class GeneratorSource extends require("./source") {
  constructor(env, patt) {}

  async consume(size) {
    this.product(Math.random())
  }
}

class RandomGeneratorSource extends GeneratorSource {}

operators.register("GeneratorSource", GeneratorSource);
module.exports = GeneratorSource;