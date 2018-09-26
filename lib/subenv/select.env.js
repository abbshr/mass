module.exports = Env => {
  // class SelectEnv extends Env {
  //   constructor(ancestorEnv, selector) {
  //     super(ancestorEnv, selector)
  //     this._op = new this.operators.SelectCalculator(this, selector)
  //   }
  // }

  Env.prototype.select = function (selector) {
    if (selector instanceof this.operators.SelectCalculator) {
      if (selector.env instanceof Env) {
        return this.pipe(selector.env)
      } else {
        // const env = new SelectEnv(this, selector.selector)
        // env.fusion(selector)
        return this.pipe((new Env(this)).fusion(selector))
      }
    } else {
      return this.pipe((new Env(this)).fusion(this.operators.SelectCalculator.create(selector)))
    }
  }
}