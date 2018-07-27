const Redis = require("@wac/raw-redis");
const { EventEmitter } = require("events");

class MassBus extends EventEmitter {
  constructor(cfg) {
    super();
    this.cfg = { ...this.defaultConfig, ...cfg };
    this.inited = false;
  }

  get defaultConfig() {
    return {
      chan: "client:mass-v2:chan",
      schema: "client:mass-v2:",
    };
  }

  async init() {
    if (!this.inited) {
      this.publisher = await Redis(this.cfg);
      this.subscriber = await Redis(this.cfg);

      await this.subscriber.subscribe(this.cfg.chan);
      this.inited = true;
      this.emit("inited");
    }
  }

  async send(signal, payload) {
    try {
      await this.publisher.publish(this.cfg.chan, this.sequelize(signal, payload));
    } catch (err) {
      console.log(err);
    }
  }

  listen(handler) {
    this.subscriber.on("message", (chan, message) => {
      if (chan === this.cfg.chan) {
        let flag = false;
        let signal, payload;
        try {
          [signal, payload] = this.destructured(message);
          flag = true;
        } catch (err) {
          console.log(err);
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