// const Env = require("./env");

// Task 基类
class MassTask {
  constructor(cfg) {
    this.cfg = { ...cfg };
    // 任务 id 必须存在
    this.taskId = this.cfg.taskId;

    this.taskName = this.cfg.taskName;
    this.taskDescription = this.cfg.taskDescription;

    // 指定该任务的最大可重调度次数
    this.maxRetryTimes = this.cfg.maxRetryTimes;

    // 任务的逻辑体, 如果没有配置, 使用原型方法
    this.executor = this.cfg.executor || this.executor;
    this.scheduler = this.cfg.scheduler;

    // 物理分支子任务
    this.childTasks = new Set();

    // 逻辑分支子任务
    this.childTasksGroup = new Set();

    this.state = this.STATE.PEND;
  }

  get STATE() {
    return {
      PEND: "pend",
      READY: "ready",
      RUN: "run",
      CANCEL: "cancel",
      FINISH: "finish",
      FAILURE: "failure",
    };
  }

  cancel() {
    this.state = this.STATE.CANCEL;
  }

  // get stopped() {
  //   return [this.STATE.FINISH, this.CANCEL, this.FAILURE].includes(this.state);
  // }

  get canceled() {
    return this.state === this.STATE.CANCEL;
  }

  get running() {
    return this.state === this.STATE.RUN;
  }

  // 执行体
  async executor(input, proceed, bus) {
    // proceed 用于将本次任务的输出传递给子任务并开始子任务调度, 如果没有后续子任务可以不用调 proceed
    // bus 用于信号传递, 任务执行期间发送信号给其他任务.
    proceed(input);
  }

  // 添加一个物理子任务
  addChildTask(massTask) {
    this.childTasks.add(massTask);
  }

  // 添加一个逻辑子任务 (根据输入可发散为多个物理子任务)
  mapChildTasks(massTask) {
    this.childTasksGroup.add(massTask);
  }

  // 显式标记任务属于一个调度器
  markScheduler(scheduler) {
    this.scheduler = scheduler;
  }

  // 设置任务的就绪条件 (默认调度器控制就绪状态)

  // 收到信号后调度
  // PRI: N + 1
  on(signal) {
    this.scheduler.signal(this, signal);
  }

  // 未来某一时间加入调度队列
  // PRI: N + 2
  at(cronExpr) {
    this.scheduler.future(this, cronExpr);
  }

  // 未来周期性时间调度
  // PRI: N + 2
  at_every(cronExpr) {
    this.scheduler.periodic(this, cronExpr);
  }

  // 加入调度队列
  // PRI: N
  sched() {
    this.scheduler.queued(this);
  }

  // 立即调度
  // PRI: N + 1
  grab() {
    this.scheduler.immediate(this);
  }
}

module.exports = MassTask;
