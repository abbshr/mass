const { Element } = require("../components/data");

module.exports = operators => {
  class StdinSource extends operators.Source {
    constructor(env) {
      super(env);

      process.stdin.on("data", chunk => {
        const elem = new Element({ input: chunk.toString() });
        if (!this.product(elem)) {
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