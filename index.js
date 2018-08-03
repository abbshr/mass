
// TODO: a better way
if (!global.repl) {
  const timers = require("safe-timers");
  global.setTimeout = timers.setTimeout;
  global.clearTimeout = timers.clearTimeout;
} else {
  // debug only
  console.log("WARN: REPL环境使用原生 timer");
}

const Mass = {
  MassTask: require("./lib/task"),
  MassStreamTask: require("./lib/stream-task"),
  MassTaskScheduler: require("./lib/scheduler"),
  MassBus: require("./lib/bus"),
  Env: require("./lib/env"),
  operators: require("./lib/operators"),
  // MassDataSet: require("./job/data"),
  ready: false,
};

async function initExternalResources(cfg) {
  await initRedis(cfg.task_store);
}

async function initRedis(cfg) {
  try {
    await require("./lib/redis").connect(cfg);
    console.log("初始化外部资源: Redis,", "配置:", cfg);
  } catch (err) {
    err.resourceName = "Redis";
    err.cfg = cfg;
    throw err;
  }
}

module.exports = async (cfg) => {
  // 统一初始化外部依赖资源
  if (!Mass.ready) {
    try {
      await initExternalResources(cfg);
      Mass.ready = true;
    } catch (err) {
      console.log(`外部资源 ${err.resourceName} 初始化失败:`, err.message);
      console.log("配置:", err.cfg);
      console.log("stack:", err.stack);
    }
  }

  return Mass;
};