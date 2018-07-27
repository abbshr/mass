module.exports = operators => {
  class LogSink extends operators.Sink {
    async produce(elem) {
      
    }
  }
  
  operators.register("LogSink", LogSink);
};