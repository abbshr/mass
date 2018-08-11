module.exports = Env => {
  class SourceEnv extends Env {
    constructor(ancestorEnv, source) {
      super(ancestorEnv, source);
      this._op = source;
      this._op.env = this;
    }
  }

  // 声明输入
  Env.prototype.from = function (source) {
    if (!source instanceof this.operators.Source) {
      throw new Error("invalid Source:", source, "只能用 Source 操作符指定输入起点");
    }

    return this.pipe(new SourceEnv(this, source));
  };
};