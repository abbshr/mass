const Redis = require("@wac/redis-client");
const redisInstanceMap = new Map();

module.exports = (alias, cfg) => {
  let redis = redisInstanceMap.get(alias);
  if (!redis) {
    redis = new Redis(cfg);
    redisInstanceMap.set(alias, redis);
  }

  return redis;
}