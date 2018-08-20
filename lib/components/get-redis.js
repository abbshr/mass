const Redis = require("@wac/redis-client");
const redisInstanceMap = new Map();

module.exports = (alias, cfg, { independent = false } = {}) => {
  if (independent) {
    return new Redis(cfg);
  }

  let redis = redisInstanceMap.get(alias);
  if (!redis) {
    redis = new Redis(cfg);
    redisInstanceMap.set(alias, redis);
  }

  return redis;
}