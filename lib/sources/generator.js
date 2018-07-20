const operators = require("../operators");

class GeneratorSource extends require("../operators/source") {
  constructor(env, patt) {}

  async consume(size) {
    this.product(Math.random())
  }
}

class RandomGeneratorSource extends GeneratorSource {}

operators.register("GeneratorSource", GeneratorSource);
operators.register("RandomGeneratorSource", RandomGeneratorSource);
module.exports = GeneratorSource;