const RedisCache = require('@wac/redis-client');

module.exports = new (class extends RedisCache {
  async hgetall(key) {
    return this.client.hgetall(key);
  }
  
  multi(...args) {
    return this.client.multi(...args);
  }
});