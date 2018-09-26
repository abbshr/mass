const pino = () => ({
  trace() {},
  debug() {},
  info() {},
  warn() {},
  error() {},
  fatal() {},

  child() {
    return this;
  },
});

pino.destination = () => {};
module.exports = pino;