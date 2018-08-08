const Mass = {
  MassTask: require("./lib/task"),
  MassStreamTask: require("./lib/stream-task"),
  MassTaskScheduler: require("./lib/scheduler"),

  Env: require("./lib/env"),
  Gen: require("./lib/gen"),
  operators: require("./lib/operators"),
  states: require("./lib/states"),

  config: require("./lib/config"),
};

module.exports = Mass;

// async function initExternalResources(cfg) {
//   await initRedis(cfg.task_store);
// }

// async function initRedis(cfg) {
//   try {
//     await require("./lib/redis").connect(cfg);
//     console.log("初始化外部资源: Redis,", "配置:", cfg);
//   } catch (err) {
//     err.resourceName = "Redis";
//     err.cfg = cfg;
//     throw err;
//   }
// }

// module.exports = async (cfg) => {
//   // 统一初始化外部依赖资源
//   if (!Mass.ready) {
//     try {
//       await initExternalResources(cfg);
//       Mass.ready = true;
//     } catch (err) {
//       console.log(`外部资源 ${err.resourceName} 初始化失败:`, err.message);
//       console.log("配置:", err.cfg);
//       console.log("stack:", err.stack);
//     }
//   }

//   return Mass;
// };