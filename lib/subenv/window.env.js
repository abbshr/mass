module.exports = Env => {
  // class WindowEnv extends Env {
  //   constructor(ancestorEnv, window) {
  //     super(ancestorEnv, window)
  //     this._op = window
  //   }
  // }
  Env.prototype.window = function (window) {
    if (window instanceof this.operators.WindowCalculator) {
      if (window.env instanceof Env) {
        return this.pipe(window.env);
      } else {
        return this.pipe((new Env(this)).fusion(window));
      }
    } else {
      throw new Error(`env.window(window) 必须以一个窗口操作符作为参数, found: ${JSON.stringify(window)}`);
    }
  };
};