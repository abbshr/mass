module.exports = operators => {
  class StdoutSink extends operators.Sink {
    constructor(env, outstream) {
      super(env);
      this.outstream = outstream;
    }

    async produce(elem) {
      console.log("stdout sink => data to send out:", elem);
      this.outstream.write(JSON.stringify(elem, null, 2));
    }

    async done() {
      console.log("stdout sink => closing.");
    }
  }

  operators.register("StdoutSink", StdoutSink);
};