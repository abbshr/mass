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
    set(key, ...args) {
      return this;
    }
    async exec() { return "OK"; }
  }

  return new (class extends EventEmitter {
    async watch() {}
    async subscribe(chan) {}
    async publish(chan, data) {
      store.emit("message", chan, data);
    }
    async hgetall(key) {
      return {};
    }
    async get(key) {
      return "";
    }
    async set(key, ...args) {
      return "OK";
    }
    async hmset() {
      return "OK";
    }
    multi() {
      return new Transaction();
    }
    on(...args) {
      store.on(...args);
    }
  });
};