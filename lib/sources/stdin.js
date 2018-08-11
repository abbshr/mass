module.exports = operators => {
  class StdinSource extends operators.Source {
    constructor(env) {
      super(env);

      this.onData = chunk => {
        if (chunk.toString().match(/^quit/)) {
          this.terminate();
        } else {
          if (!this.product({ record: chunk.toString() })) {
            process.stdin.pause();
          }

          process.stdin.once("data", this.onData);
        }
      }

      process.stdin.once("data", this.onData);
    }

    async consume() {
      process.stdin.resume();
    }

    async done() {
      process.stdin.pause();
      process.stdin.off("data", this.onData);
      console.log("stdin source => close")
    }
  }

  operators.register("StdinSource", StdinSource);
};