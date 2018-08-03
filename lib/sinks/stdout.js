const operators = require("../operators");
module.exports = operators => {
  class StdoutSink extends operators.Sink {
    async produce(elems) {
      console.log("stdout sink => received elements:");
      console.table(elems);

      console.log("stdout sink => data to send out:");
      for (const elem of elems) {
        console.table(elem);
      }
    }
    async done() {
      console.log("stdout sink => closing.");
    }
  }
  
  operators.register("StdoutSink", StdoutSink);
};