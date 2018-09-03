// Task API
class MassTask extends require("./task.base") {
// 执行体
  async executor(input, proceed, bus) {
    // proceed 用于将本次任务的输出传递给子任务并开始子任务调度, 如果没有后续子任务可以不用调 proceed
    // bus 用于信号传递, 任务执行期间发送信号给其他任务.
    proceed(input);
  }

// 子任务 API
  // 添加一个物理子任务
  addChildTask(TaskClass, cfg) {
    if (TaskClass instanceof MassTask) {
      this.childTasks.add(TaskClass);
    } else {
      // TODO: 为每个子任务生成独立镜像
      this.childTasks.add([TaskClass, cfg]);
    }
  }

  // 添加一个逻辑子任务 (根据输入可发散为多个物理子任务)
  mapChildTasks(TaskClass, cfg) {
    // TODO: 为每个子任务生成独立镜像
    if (TaskClass instanceof MassTask) {
      this.childTasksGroup.add(TaskClass);
    } else {
      this.childTasksGroup.add([TaskClass, cfg]);
    }
  }

  // 容错 API
  useFaultTolerateStrategy(FaultTolerateStrategyClass) {
    this.faultTolerateStrategy = new FaultTolerateStrategyClass(this);
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
  sched(input) {
    this.schedFlag = this.scheduler.SCHED_FLAGS.NORMAL;
    this.scheduler.queued(this, input);
    return this;
  }

  // 立即调度
  // PRI: N + 1
  grab(input) {
    this.schedFlag = this.scheduler.SCHED_FLAGS.IMMEDIATE;
    this.scheduler.immediate(this, input);
    return this;
  }

  // 显式标记任务属于一个调度器
  join(scheduler) {
    this.scheduler = scheduler;
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

// 任务自定义静态数据 API
  get(key) {
    return this._data[key];
  }

  set(...args) {
    if (args.length === 1) {
      this.all = value;
    } else {
      const [key, value] = args;
      this._data[key] = value;
    }
    return this;
  }

  get all() {
    return this._data;
  }

  set all(data) {
    return Object.assign(this._data, data);
  }
}

module.exports = MassTask;
