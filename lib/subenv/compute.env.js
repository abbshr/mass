module.exports = Env => {
  class CalculatorEnv extends Env {
    constructor(ancestorEnv, calculator) {
      super(ancestorEnv, calculator);
      this._op = calculator;
      this._op.env = this;
    }
  }

  // 声明链式计算操作
  Env.prototype.compute = function (calculator) {
    if (calculator instanceof this.operators.ShardCalculator) {
      throw new Error("ShardCalculator 无法用 `.compute()` 定义, 请使用 `Env.prototype.shard(traitFn)` 方法声明");
    }

    if (calculator instanceof this.operators.Calculator) {
      return this.pipe(new CalculatorEnv(this, calculator));
    }

    throw new Error("invalid Calculator:", calculator, "只能通过 Calculator 操作符定义计算");
  };
};