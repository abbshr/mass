const { EventEmitter } = require("events");
const getRedis = require("./redis");

class MassBus extends EventEmitter {
  constructor(cfg) {
    super();
    this.cfg = { ...this.defaultConfig, ...cfg };
    this.subscriber = getRedis("subscriber", this.cfg);
    this.publisher = getRedis("publisher", this.cfg);

    this.subscriber.subscribe(this.cfg.chan);
  }

  get defaultConfig() {
    return {
      chan: "chan",
      schema: "client:mass-v2:bus:",
    };
  }

  async send(signal, payload) {
    try {
      await this.publisher.publish(this.cfg.chan, this.sequelize(signal, payload));
    } catch (err) {
      console.log(this.constructor.name, "信号发送失败:", { signal, payload , chan: this.cfg.chan }, err);
    }
  }

  listen(handler) {
    this.subscriber.onceMessage((chan, message) => {
      if (chan === this.cfg.chan) {
        let flag = false;
        let signal, payload;
        try {
          [signal, payload] = this.destructured(message);
          flag = true;
        } catch (err) {
          console.log(this.constructor.name, "消息体解构失败:", { message, chan }, err);
        }

        if (flag) {
          handler(signal, payload);
        }
      }
    });
  }

  sequelize(signal, payload) {
    return JSON.stringify([signal, payload]);
  }

  destructured(message) {
    return JSON.parse(message);
  }
}

module.exports = MassBus;