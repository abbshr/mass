module.exports = Env => {
  // class ProduceEnv extends Env {
  //   constructor(ancestorEnv, template) {
  //     super(ancestorEnv, template)
  //     this._op = new this.operators.ProduceCalculator(this, template)
  //   }
  // }

  Env.prototype.produce = function (template) {
    if (template instanceof this.operators.ProduceCalculator) {
      if (template.env instanceof Env) {
        return this.pipe(template.env)
      } else {
        // const env = new Env(this, template.template)
        // env.fusion(template)
        return this.pipe((new Env(this)).fusion(template))
      }
    } else {
      return this.pipe((new Env(this)).fusion(this.operators.ProduceCalculator.create(template)))
    }
  }
}