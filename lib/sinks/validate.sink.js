module.exports = operators => {
  class ValidateSink extends operators.Sink {
    constructor(env, validator) {
      super(env);
      this.validator = validator;
      this.validCount = 0;
    }
  
    async produce(elem) {
      if (!this.validator(elem)) {
        throw new Error(`ValidateSink: 非法数据 ${JSON.stringify(elem)}. 已检测通过元素数量: ${this.validCount}`);
      }
      this.validCount++;
    }
  
    async done() {
      this.log.warn("All check phase passed!");
    }

    async fatal(err) {
      this.log.fatal(err, "%s 出现异常", this.constructor.name);
    }

    async cleanup() {
      this.log.info("%s exit", this.constructor.name);
    }
  }
  
  operators.register("ValidateSink", ValidateSink);
};