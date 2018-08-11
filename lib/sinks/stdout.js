module.exports = operators => {
  class StdoutSink extends operators.Sink {
    async produce(elems) {
      console.log("stdout sink => received elements:", elems);

      for (const elem of elems) {
        console.log("stdout sink => data to send out:", elem);
      }
    }
    async done() {
      console.log("stdout sink => closing.");
    }
  }
  
  operators.register("StdoutSink", StdoutSink);
};