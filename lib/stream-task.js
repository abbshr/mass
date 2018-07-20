const Env = require("./env");

class MassStreamTask extends require("./task") {
  constructor(cfg) {
    super(cfg);
    this.streamProcessExecutor = this.cfg.streamProcessExecutor || this.streamProcessExecutor;
  }

  async executor(input, proceed, bus) {
    await this.streamProcessExecutor(new Env(this.cfg), bus);
    proceed(input);
  }

  at_every() {
    throw new Error("不能对流处理任务设置周期调度修饰符");
  }

  // 流处理任务执行体
  async streamProcessExecutor(env, bus) {
    // stream process body
  }
}

module.exports = MassStreamTask;
