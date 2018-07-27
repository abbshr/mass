module.exports = Env => {
  class GenerateEnv extends Env {
    constructor(ancestorEnv, config) {
      super(ancestorEnv);
      this._op = new this.operators.GeneratorSource(this, config);
    }
  }

  Env.prototype.generate = function (config) {
    const generateEnv = new GenerateEnv(this, config);
    return this.pipe(generateEnv);
  };
};