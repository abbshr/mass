module.exports = Env => {
  // class MutateEnv extends Env {
  //   constructor(ancestorEnv, mutFn) {
  //     super(ancestorEnv, mutFn)
  //     this._op = new this.operators.MutateCalculator(this, mutFn)
  //   }
  // }

  Env.prototype.mutate = function (mutFn) {
    if (mutFn instanceof this.operators.MutateCalculator) {
      if (mutFn.env instanceof Env) {
        return this.pipe(mutFn.env)
      } else {
        // const env = new MutateEnv(this, mutFn.mutFn)
        // env.fusion(mutFn)
        return this.pipe((new Env(this)).fusion(mutFn))
      }
    } else {
      return this.pipe((new Env(this)).fusion(this.operators.MutateCalculator.create(mutFn)))
    }
  }
}