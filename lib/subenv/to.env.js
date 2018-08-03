module.exports = Env => {
  class SinkEnv extends Env {
    constructor(ancestorEnv, sink) {
      super(ancestorEnv, sink);
      this._op = sink;
      this._op.env = this;
    }
  }

  // 声明输出
  Env.prototype.to = function (sink) {
    if (sink instanceof this.operators.Sink) {
      return this.pipe(new SinkEnv(this, sink));
    }

    throw new Error("invalid Sink:", sink, "只能用 Sink 操作符指定输出终点");
  };
};