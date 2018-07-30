module.exports = operators => {
  class ValidateSink extends operators.Sink {
    constructor(env, validator) {
      super(env);
      this.validator = validator;
      this.validCount = 0;
    }
  
    async produce(elems) {
      for (let elem of elems) {
        // TODO: use MassElement method
        if (!this.validator(elem)) {
          throw new Error(`ValidateSink: 非法数据 ${JSON.stringify(elem)}. 已检测通过元素数量: ${this.validCount}`);
        }
        this.validCount++;
      }
    }
  
    async done() {
      console.log("All check phase passed!");
    }
  
    async fatal(err) {
      console.log("X", err);
    }

    async cleanup() {
      console.log(this.constructor.name, "exit");
    }
  }
  
  operators.register("ValidateSink", ValidateSink);
};