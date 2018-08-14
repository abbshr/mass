module.exports = operators => {
  class StdinSource extends operators.Source {
    constructor(env, instream) {
      super(env);

      this.instream = instream;

      this.onData = chunk => {
        if (chunk.toString().match(/^quit/)) {
          this.terminate();
        } else {
          if (!this.product({ record: chunk.toString() })) {
            this.instream.pause();
          }

          this.instream.once("data", this.onData);
        }
      }

      this.instream.once("data", this.onData);
    }

    async consume() {
      this.instream.resume();
    }

    async done() {
      this.instream.pause();
      this.instream.off("data", this.onData);
      console.log("stdin source => close")
    }
  }

  operators.register("StdinSource", StdinSource);
};