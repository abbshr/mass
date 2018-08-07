const TaskStore = require("./task-store");

// Task API
class MassTask extends require("./task.base") {
  constructor(cfg) {
    super(cfg);

    // 任务逻辑使用的状态数据
    this.taskStore = new TaskStore(this.taskId);
  }

  // 状态数据持久化 API
  async initStore() {
    return this.taskStore.init();
  }

  async commitStore() {
    return this.taskStore.commit();
  }

  async resetStore() {
    return this.taskStore.rollback();
  }

  async getStore(key) {
    return this.taskStore.get(key);
  }

  async setStore(key, value) {
    return this.taskStore.set(key, value);
  }

  async delStore(key) {
    return this.taskStore.del(key);
  }

  // 任务调度 API
  // 设置任务的就绪条件 (默认调度器控制就绪状态)

  // 收到信号后调度
  // PRI: N + 1
  on(signal) {
    this.args = signal;
    this.schedFlag = this.scheduler.SCHED_FLAGS.SIGNAL;
    this.scheduler.signal(this, this.args);
    return this;
  }

  // 未来时间加入调度队列
  // PRI: N + 2
  at(cronExpr) {
    this.args = cronExpr;
    this.schedFlag = this.scheduler.SCHED_FLAGS.FUTURE;
    this.scheduler.future(this, this.args);
    return this;
  }

  // 未来周期性时间调度
  // PRI: N + 2
  at_every(cronExpr) {
    this.args = cronExpr;
    this.attr = this.ATTRS.ONCE;
    this.schedFlag = this.scheduler.SCHED_FLAGS.PERIODIC;
    this.scheduler.periodic(this, this.args);
    return this;
  }

  // 加入调度队列
  // PRI: N
  sched() {
    this.schedFlag = this.scheduler.SCHED_FLAGS.NORMAL;
    this.scheduler.queued(this);
    return this;
  }

  // 立即调度
  // PRI: N + 1
  grab() {
    this.schedFlag = this.scheduler.SCHED_FLAGS.IMMEDIATE;
    this.scheduler.immediate(this);
    return this;
  }

  // 任务属性 API
  // 可反复调度
  repeat() {
    // 不能对 periodic 调度设置 repeat (本身是时间触发调度的)
    if (this.schedFlag !== this.scheduler.SCHED_FLAGS.PERIODIC) {
      this.attr = this.ATTRS.REPEATABLE;
    }
    return this;
  }

  // 执行模式 API
  // 任务体互斥执行
  mutex(resourceId) {
    this.executeFlag = this.EXECUTE_FLAGS.MUTEX;
    this.resourceId = resourceId;
    return this;
  }
}

module.exports = MassTask;
