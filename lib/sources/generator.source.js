module.exports = operators => {
  class GeneratorSource extends operators.Source {
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

    terminate() {
      this.halt();
      super.terminate();
    }

    haltPoll() {
      clearInterval(this.ref);
      this.ref = null;
      this.running = false;
    }

    async poll() {
      if (!this.running) {
        this.running = true;
        this.ref = setInterval(() => this.crunch(), this.frequency);
      }
    }

    async consume() {
      let record = null
      try {
        record = this.emitter()
      } catch (err) {
        this.ignorable(err)
      }

      if (this.counter < this.limit) {
        this.product({ record });
        this.counter++;
      } else {
        this.terminate();
      }
    }
  
    async cleanup() {
      this.log.info("%s exit", this.constructor.name);
    }
  }
  
  operators.register("GeneratorSource", GeneratorSource);
};