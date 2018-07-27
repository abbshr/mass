module.exports = Env => {
  class TapEnv extends Env {
    constructor(ancestorEnv, probeFn) {
      super(ancestorEnv);
      this._op = new this.operators.TapCalculator(this, probeFn);
    }
  }

  // 打开查看一个管道里的数据流
  // 一般目的用于开发新的 op 或调试 op 时使用
  Env.prototype.tap = function (probeFn) {
    const tapEnv = new TapEnv(this, probeFn);
    return this.pipe(tapEnv);
  };
};