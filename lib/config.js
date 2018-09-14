/**
 * Mass Config
 * 框架基础配置
 * 
 * 可通过覆盖每个 config 项来实现自定义配置
 */


const commonConfig = {
  commonPrefix: "client:mass-v2:",
};

// 互斥信号量配置
const mutexConfig = {
  schema: `${commonConfig.commonPrefix}mutex:`,
  lockLeaseFactor: 0.5,
  lockExpire: 60,
};

// 消息总线配置
const busConfig = {
  schema: `${commonConfig.commonPrefix}bus:`,
  chan: `${commonConfig.commonPrefix}chan`
};

// 任务状态存储接口配置
const taskStoreConfig = {
  schema: `${commonConfig.commonPrefix}task-store:`
};

// 日志配置
const syslogConfig = {
  options: {
    prettyPrint: true,
    level: "trace",
  },
};

const applogConfig = {
  options: {
    prettyPrint: true,
    level: "trace",
  },
};

module.exports = {
  get commonConfig() { return commonConfig; },
  get mutexConfig() { return mutexConfig; },
  get taskStoreConfig() { return taskStoreConfig; },
  get busConfig() { return busConfig; },
  get syslogConfig() { return syslogConfig; },
  get applogConfig() { return applogConfig; },

  setConfig(configPhase, newConfig) {
    if (this.hasOwnProperty(configPhase)) {
      return Object.assign(this[configPhase], newConfig);
    } else {
      throw new Error(`找不到 ${configPhase} 配置项`);
    }
  }
};