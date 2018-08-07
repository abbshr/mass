const TaskStore = require("./task-store");
const Chance = require("chance");
const chance = new Chance();

// Task 基类
class MassTaskBase {
  constructor(cfg) {
    this.cfg = { ...cfg };
    // 任务 id 必须存在
    this.taskId = this.cfg.taskId;

    if (!this.taskId) {
      // throw new Error("必须指定 task.taskId");
      this.taskId = chance.guid();
      console.log(`auto generate taskId ${this.taskId} for task`, this);
    }

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

    // // 任务逻辑使用的状态数据
    // this.taskStore = new TaskStore(this.taskId);

    // 任务初始状态为等待
    this.state = this.STATE.PEND;

    // 任务属性
    this.attr = this.cfg.attr || this.ATTRS.ONCE;
    // 执行标记
    this.executeFlag = this.cfg.executeFlag || this.EXECUTE_FLAGS.INDEPENDENT;

    // 引用互斥资源 ID
    if (this.executeFlag === this.EXECUTE_FLAGS.MUTEX) {
      this.resourceId = this.cfg.resourceId || null;

      if (!this.resourceId) {
        throw new Error("互斥执行标记的任务必须提供一个互斥资源的 resourceId");
      }
    }
  }

  get STATE() {
    return {
      PEND: "pend",
      READY: "ready",
      RUN: "run",
      CANCEL: "cancel",
      FINISH: "finish",
      FAILURE: "failure",
      WAIT_MUTEX: "wait_mutex",
    };
  }

  get EXECUTE_FLAGS() {
    return {
      MUTEX: "mutex",
      INDEPENDENT: "independent", 
    };
  }

  get ATTRS() {
    return {
      ONCE: "once",
      REPEATABLE: "repeatable",
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
  join(scheduler) {
    this.scheduler = scheduler;
    return this;
  }
}

module.exports = MassTaskBase;
