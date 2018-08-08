const Redis = require("./redis");
const redisInstanceMap = new Map();

module.exports = (alias, cfg) => {
  let redis = redisInstanceMap.get(alias);
  if (!redis) {
    console.log(alias, cfg.schema);
    redis = new Redis(cfg);
    redisInstanceMap.set(alias, redis);
  }

  return redis;
}