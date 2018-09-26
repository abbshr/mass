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
    if (!calculator instanceof this.operators.Calculator) {
      throw new Error(`invalid Calculator: ${calculator}. 只能通过 Calculator 操作符定义计算`);
    }

    if (calculator.env instanceof Env) {
      if (calculator instanceof this.operators.ShardCalculator) {
        throw new Error(`ShardCalculator 不能被共享, 检查到已被 env: ${calculator.env} 占用`);
      } else {
        return this.pipe(calculator.env);
      }
    } else {
      return this.pipe(new CalculatorEnv(this, calculator));
    }
  };
};