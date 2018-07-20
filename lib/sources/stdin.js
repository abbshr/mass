const { Element } = require("../components/data");
const operators = require("../operators");

class StdinSource extends require("../operators/source") {
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
module.exports = StdinSource;