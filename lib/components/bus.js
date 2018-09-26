const config = require("../config");
const getRedis = require("./get-redis");
const syslog = require("../syslog");

class MassBus {
  constructor() {
    this.cfg = config.busConfig;

    this.subscriber = getRedis("subscriber", this.cfg);
    this.publisher = getRedis("publisher", this.cfg);

    this.subscriber.subscribe(this.cfg.chan);

    this.log = syslog.child({ module: `[${this.constructor.name}]` });
  }

  async send(signal, payload) {
    try {
      return await this.publisher.publish(this.cfg.chan, this.sequelize(signal, payload));
    } catch (err) {
      this.log.error(err, "信号 %o 发送失败.", { signal, payload, chan: this.cfg.chan });
      return err;
    }
  }

  listen(handler) {
    const onMessage = (chan, message) => {
      if (chan === this.cfg.chan) {
        let unpackSucceed = false;
        let signal, payload;

        try {
          [signal, payload] = this.destructured(message);
          unpackSucceed = true;
        } catch (err) {
          this.log.error(err, "消息体 %o 解构失败.", { message, chan });
        }

        if (unpackSucceed) {
          handler(signal, payload);
        } else {
          // 拆包失败则重新监听
          this.subscriber.once("message", onMessage);
        }
      }
    };

    this.subscriber.once("message", onMessage);
  }

  sequelize(signal, payload) {
    return JSON.stringify([signal, payload]);
  }

  destructured(message) {
    return JSON.parse(message);
  }
}

module.exports = MassBus;