module.exports = operators => {
  class StdinSource extends operators.Source {
    constructor(env) {
      super(env);

      process.stdin.on("data", chunk => {
        if (!this.product({ record: chunk.toString() })) {
          process.stdin.pause();
        }
      });
    }
    async consume() {
      process.stdin.resume();
    }
  }

  operators.register("StdinSource", StdinSource);
};