module.exports = Env => {
  class ValidateEnv extends Env {
    constructor(ancestorEnv, validator) {
      super(ancestorEnv);
      this._op = new this.operators.ValidateSink(this, validator);
    }
  }

  // 开发调试专用
  // 检查带输出流的数据是否符合要求
  Env.prototype.validate = function (validator) {
    const checkEnv = new ValidateEnv(this, validator);
    return this.pipe(checkEnv);
  };
};