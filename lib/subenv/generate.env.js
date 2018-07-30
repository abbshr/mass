module.exports = Env => {
  class GenerateEnv extends Env {
    constructor(ancestorEnv, config) {
      super(ancestorEnv,config);
      this._op = new this.operators.GeneratorSource(this, config);
    }
  }

  Env.prototype.generate = function (config) {
    return this.pipe(new GenerateEnv(this, config));
  };
};