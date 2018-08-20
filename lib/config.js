// class MassConfig {
//   constructor(cfg) {
//     Object.assign(this, this.externalConfig, { ...cfg });
//   }

//   // 外部配置对象
//   get externalConfig() {}

//   get commonPrefix() {
//     return "client:mass-v2:";
//   }
// }

const massConfig = {
  commonPrefix: "client:mass-v2:",
};

const mutexConfig = {
  schema: `${massConfig.commonPrefix}mutex:`,
  lockLeaseFactor: 0.5,
  lockExpire: 10 * 1000,
};

const busConfig = {
  schema: `${massConfig.commonPrefix}bus:`,
  chan: `${massConfig.commonPrefix}chan`
};

const taskStoreConfig = {
  schema: `${massConfig.commonPrefix}task-store:`
};

// class MutexConfig extends MassConfig {
//   get schema() {
//     return `${this.commonPrefix}mutex:`;
//   }

//   get lockLeaseFactor() {
//     return 0.5;
//   }

//   get lockExpire() {
//     return 10 * 1000;
//   }
// }

// class BusConfig extends MassConfig{
//   get schema() {
//     return `${this.commonPrefix}bus:`;
//   }

//   get chan() {
//     return `${this.schema}chan`;
//   }
// }

// class TaskStoreConfig extends MassConfig{
//   get schema() {
//     return `${this.commonPrefix}task-store:`;
//   }
// }

module.exports = {
  massConfig,
  mutexConfig,
  taskStoreConfig,
  busConfig,
};