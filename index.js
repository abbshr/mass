module.exports = masscfg => {
  const config = require("./lib/config");
  config.merge(masscfg);

  const syslog = require("./lib/syslog");
  const applog = require("./lib/applog");

  const MassTask = require("./lib/task");
  const MassStreamTask = require("./lib/stream-task");
  const MassTaskScheduler = require("./lib/scheduler");
  const strategies = require("./lib/fault-tolerate");

  const Env = require("./lib/env");
  const Gen = require("./lib/gen");
  const operators = require("./lib/operators");
  const states = require("./lib/states");

  return {
    MassTask,
    MassStreamTask,
    MassTaskScheduler,
    strategies,

    stream: {
      Env,
      Gen,
      operators,
      states,
      // 设置所有运算符的默认失败处理模式
      set fault_mode(mode) {
        this.operators.Source.fault_mode = mode;
        this.operators.Calculator.fault_mode = mode;
        this.operators.Sink.fault_mode = mode;
      },

      fault: {
        mode: {
          IGNORE: "ignore",
          THROWN: "thrown",
        },
      },
    },

    // 配置
    config,

    applog,
    syslog,

    log: applog,
  };
};