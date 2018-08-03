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
  
    async halt() {
      clearInterval(this.ref);
      this.ref = null;
      this.running = false;
    }
  
    async terminate() {
      await this.halt();
      await super.terminate();
    }
  
    // async done() {
    //   console.log(this.constructor.name, "ended");
    // }
    async cleanup() {
      console.log(this.constructor.name, "exit");
    }
  
    async consume(size) {
      if (!this.running) {
        this.running = true;
        this.ref = setInterval(async () => {
          try {
            if (this.counter < this.limit) {
              if (!this.product({ record: await this.emitter() })) {
                this.halt();
              }
              this.counter++;
            } else {
              this.terminate();
            }
          } catch (err) {
            this.fault(err);
          }
        }, this.frequency);
      }
    }
  }
  
  operators.register("GeneratorSource", GeneratorSource);
};