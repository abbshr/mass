const { EventEmitter } = require("events");
const store = new EventEmitter();

module.exports = async () => {
  class Transaction {
    hmset(key, ...args) {
      return this;
    }
    hdel(key, ...args) {
      return this;
    }
    async exec() { return "OK"; }
  }

  return new (class extends EventEmitter {
    async subscribe(chan) {}
    async publish(chan, data) {
      store.emit("message", "client:mass-v2:chan", data);
    }
    async hgetall(key) {
      return {};
    }
    multi() {
      return new Transaction();
    }
    on(...args) {
      store.on(...args);
    }
  });
};