const util = require("util");

module.exports = operators => {
  class StdoutSink extends operators.Sink {
    constructor(env, outstream) {
      super(env);
      this.outstream = outstream;
    }

    async produce(elem) {
      this.outstream.write(util.inspect(elem, { colors: true }));;
    }

    async done() {
      console.log("stdout sink => closing.");
    }
  }

  operators.register("StdoutSink", StdoutSink);
};