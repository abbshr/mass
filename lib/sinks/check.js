class CheckSink extends require("../operators/sink") {
  constructor(env, validator) {
    super(env);
    this.validator = validator;
  }

  async produce(elems) {
    for (let elem of elems) {
      // TODO: use MassElement method
      if (!this.validator(elem)) {
        throw new Error(`CheckCalculator: 非法数据 ${JSON.stringify(elem)}`);
      }
    }
  }

  async fault(err) {
    console.log(err);
  }

  async done() {
    console.log("All check phase passed!");
  }
}

require("../operators").register("CheckSink", CheckSink);
module.exports = CheckSink;