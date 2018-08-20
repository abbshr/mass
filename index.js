const mass = {
  MassTask: require("./lib/task"),
  MassStreamTask: require("./lib/stream-task"),
  MassTaskScheduler: require("./lib/scheduler"),
  strategies: require("./lib/fault-tolerate"),

  stream: {
    Env: require("./lib/env"),
    Gen: require("./lib/gen"),
    operators: require("./lib/operators"),
    states: require("./lib/states"),
  },

  config: require("./lib/config"),
};

module.exports = mass;