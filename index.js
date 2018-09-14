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

    // 设置所有运算符的默认失败处理模式
    set fault_mode(mode) {
      this.operators.Source.fault_mode = mode;
      this.operators.Calculator.fault_mode = mode;
      this.operators.Sink.fault_mode = mode;
    },

    fault: {
      mode: {
        IGNORE: "ignore",
        THROW: "throw",
      },
    },
  },

  // 配置
  config: require("./lib/config"),

  // 应用日志
  get applog() {
    return require("./lib/applog")();
  },

  get log() {
    return this.applog;
  },

  get syslog() {
    return require("./lib/syslog")();
  },
};

module.exports = mass;