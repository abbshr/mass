const operators = require("../operators");

class LogSink extends require("../operators/sink") {
  async produce(elem) {
    
  }
}

operators.register("LogSink", LogSink);
module.exports = LogSink;