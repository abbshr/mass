module.exports = Env => {
  // class DropEnv extends Env {
  //   constructor(ancestorEnv, removal) {
  //     super(ancestorEnv, removal)
  //     this._op = new this.operators.DropCalculator(this, removal)
  //   }
  // }

  Env.prototype.drop = function (removal) {
    if (removal instanceof this.operators.DropCalculator) {
      if (removal.env instanceof Env) {
        return this.pipe(removal.env)
      } else {
        // const env = new Env(this, removal.removal)
        // env.fusion(removal)
        return this.pipe((new Env(this)).fusion(removal))
      }
    } else {
      return this.pipe((new Env(this)).fusion(this.operators.DropCalculator.create(removal)))
    }
  }
}