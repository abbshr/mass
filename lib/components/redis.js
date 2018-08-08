const RedisCache = require('@wac/redis-client');

class Redis extends RedisCache {
  async hgetall(key) {
    await this._criteria();
    return this.client.hgetall(key);
  }
  
  async multi(...args) {
    await this._criteria();
    return this.client.multi(...args);
  }

  async watch(...args) {
    await this._criteria();
    return this.client.watch(...args);
  }

  async subscribe(...args) {
    await this._criteria();
    return this.client.subscribe(...args);
  }

  async publish(...args) {
    await this._criteria();
    return this.client.publish(...args);
  }

  onMessage(callback) {
    if (this.ready) {
      this.client.on("message", callback);
    } else if (this.lastConnectionError) {
      console.log("redis onMessage:", err);
    } else {
      this.once("ready", () => this.client.on("message", callback));
    }
  }

  onceMessage(callback) {
    if (this.ready) {
      this.client.once("message", callback);
    } else if (this.lastConnectionError) {
      console.log("redis onceMessage:", err);
    } else {
      this.once("ready", () => this.client.once("message", callback));
    }
  }

  offMessage(callback) {
    if (this.ready) {
      this.client.off("message", callback);
    } else if (this.lastConnectionError) {
      console.log("redis offMessage:", err);
    } else {
      this.once("ready", () => this.client.off("message", callback));
    }
  }

  offAllMessage() {
    if (this.ready) {
      this.client.removeAllListeners("message");
    } else if (this.lastConnectionError) {
      console.log("redis offAllMessage:", err);
    } else {
      this.once("ready", () => this.client.removeAllListeners("message"));
    }
  }
}

module.exports = Redis;