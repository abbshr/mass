const operators = require("../operators");

class StdoutSink extends require("./sink") {
  async produce(elems) {
    console.log("stdout sink => received elements:");
    console.table(elems);

    console.log("stdout sink => data to send out:");
    for (const elem of elems) {
      console.table(elem.serialize());
    }
  }
  async done() {
    console.log("stdout sink => closing.");
  }
}

operators.register("StdoutSink", StdoutSink);
module.exports = StdoutSink;