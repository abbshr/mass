class GeneratorSource extends require("../operators/source") {
  constructor(env, opts) {
    super(env);
    this.running = false;
    this.ref = null;

    this.limit = opts.limit || Infinity;
    this.frequency = opts.frequency || 1000;
    this.emitter = (() => {
      if (typeof opts.emitter === "function") {
        return opts.emitter;
      } else if (opts.emitter != undefined) {
        return () => opts.emitter;
      } else {
        return () => 1;
      }
    })();

    this.counter = 0;
  }

  async halt() {
    clearInterval(this.ref);
    this.ref = null;
    this.running = false;
  }

  async done() {
    console.log(this.constructor.name, "ended");
  }

  async consume(size) {
    if (!this.runing) {
      this.runing = true;
      this.ref = setInterval(async () => {
        if (this.counter < this.limit) {
          // TODO: create MassElement
          if (!this.product({ record: await this.emitter() })) {
            this.halt();
          }
          this.counter++;
        } else {
          this.halt();
          this.terminate();
        }
      }, this.frequency);
    }
  }
}

require("../operators").register("GeneratorSource", GeneratorSource);
module.exports = GeneratorSource;