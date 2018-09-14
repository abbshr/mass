module.exports = operators => {
  class NilSink extends operators.Sink {
    async produce() {
      // empty
    }
  }

  operators.register("NilSink", NilSink);
};