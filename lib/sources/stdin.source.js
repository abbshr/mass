module.exports = operators => {
  class StdinSource extends operators.Source {
    constructor(env, instream) {
      super(env);

      this.onData = rawdata => this.crunch(rawdata);
      this.instream = instream;
      this.instream.on("data", this.onData);
      this.instream.on("error", err => this.recovery(err));
    }

    async poll() {
      this.instream.resume();
    }

    haltPoll() {
      this.instream.pause();
    }

    async consume(elem) {
      if (elem.record.toString().match(/^quit/)) {
        this.terminate();
      } else {
        this.product({ record: elem.record.toString("utf8") })
      }
    }

    async done() {
      this.instream.pause();
      this.instream.off("data", this.onData);
    }

    async cleanup() {
      this.log.info("stdin source => close");
    }
  }

  operators.register("StdinSource", StdinSource);
};