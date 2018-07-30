const Env = require("./env");
const EnvResourceManager = require("./resource");

class MassStreamTask extends require("./task") {
  constructor(cfg) {
    super(cfg);
    this.streamProcessExecutor = this.cfg.streamProcessExecutor || this.streamProcessExecutor;
  }

  async executor(input, proceed, bus) {
    // 每个流处理任务从一个独立的 env 根对象开始
    const rootenv = new Env(null, this.cfg);
    // env 全局资源管理器
    const resourceManager = new EnvResourceManager(rootenv);

    // 流处理任务上下文 (streamProcessExecutor) 中抛出的自定义的错误
    // 如果有自定义错误抛出, 则优先处理
    try {
      await this.streamProcessExecutor(rootenv, bus);
    } catch (err) {
      // 提前释放所有 env 资源
      resourceManager.free(rootenv);
      throw err;
    }

    // 等待末端运算符退出 (正常完成或异常退出)
    await resourceManager.waitExtremityEnvsRelease();
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
