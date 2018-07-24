module.exports = Env => class TapEnv extends Env {
  constructor(env, probeFn) {
    this._op = new this.operators.TapCalculator(probeFn);
  }
};