module.exports = Env => {
  Env.prototype.window = function (window) {
    if (window instanceof this.operators.WindowCalculator) {
      if (window.env instanceof Env) {
        return this.pipe(window.env);
      } else {
        return this.pipe(new Env(this, window));
      }
    } else {
      throw new Error(`env.window(window) 必须以一个窗口操作符作为参数, found: ${JSON.stringify(window)}`);
    }
  };
};