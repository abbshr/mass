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
  
    async cleanup() {
      console.log(this.constructor.name, "exit");
    }
  
    async consume(size) {
      if (!this.running) {
        this.running = true;
        this.ref = setInterval(async () => {
          let record = null;
          try {
            record = this.emitter();
          } catch (error) {
            await this.halt();
            // this.lastError = error;
            return process.nextTick(() => {
              this.failback(error).catch(err => this.purge(err));
            });
          }

          if (this.counter < this.limit) {
            if (!this.product({ record })) {
              this.halt();
            }
            this.counter++;
          } else {
            this.terminate();
          }
        }, this.frequency);
      }
    }
  }
  
  operators.register("GeneratorSource", GeneratorSource);
};