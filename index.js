// debug only
if (!global.repl) {
  const timers = require("safe-timers");
  global.setTimeout = timers.setTimeout;
  global.clearTimeout = timers.clearTimeout;
} else {
  console.log("WARN: REPL环境使用原生 timer");
}

const Mass = {
  MassTask: require("./lib/task"),
  MassStreamTask: require("./lib/stream-task"),
  MassTaskScheduler: require("./lib/scheduler"),
  MassBus: require("./lib/bus"),
  Env: require("./lib/env"),
  operators: require("./lib/operators").loadall(),
  // MassDataSet: require("./job/data")
}

module.exports = Mass