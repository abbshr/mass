const TaskStore = require("./components/task-store");
const Executor = require("./executor");
const strategies = require("./fault-tolerate");
const Chance = require("chance");
const chance = new Chance();

// Task 基类
class MassTaskBase {
  constructor(cfg) {
    this.cfg = { ...cfg };
    // 任务 id 必须存在
    this.taskId = this.cfg.taskId;

    if (!this.taskId) {
      this.taskId = chance.guid();
      console.log(`auto generate taskId ${this.taskId} for task`, this);
    }

    // 自定义静态数据
    this._data = {};

    this.type = "task";
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

    // 任务逻辑使用的状态数据
    this.taskStore = new TaskStore(this.taskId);

    // 任务初始状态为等待
    this.state = this.STATE.PEND;

    // 重试次数
    this.retries = 0;

    // 默认的容错策略
    this.faultTolerateStrategy = new strategies.DefaultFaultTolerateStrategy(this);

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
      DEAD: "dead",
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

  get stopped() {
    return
      [this.STATE.FINISH, this.STATE.CANCEL, this.STATE.FAILURE].includes(this.state)
      && !this.scheduler.taskRegistry.has(this.taskId);
  }

  get canceled() {
    return this.state === this.STATE.CANCEL;
  }

  get running() {
    return this.state === this.STATE.RUN;
  }

  clone() {
    // 取得当前任务的可枚举属性
    const currentProperties = { ...this };
    delete currentProperties.taskId;
    delete currentProperties.state;
    delete currentProperties.retries;

    // 创建任务拷贝, 并强制生成新的 taskId
    const copy = new this.constructor({ ...this.cfg, taskId: null });

    Object.assign(copy, currentProperties);

    // 创建新的容错策略对象
    if (copy.faultTolerateStrategy) {
      copy.faultTolerateStrategy = new copy.faultTolerateStrategy.constructor(copy);
    }

    return copy;
  }

  // 生成 task 的物理执行体
  // task.taskId 必须存在
  // 如果有子任务, 会在这里进行检查和传播建立
  createExecutor(args) {
    return new Executor(this.scheduler, this, args);
  }

  async faultTolerate(input, err) {
    // 默认策略: 重新调度
    if (!this.scheduler) {
      console.log("任务", this, "没有关联的调度器, 容错策略无法生效!");
    } else {
      await this.faultTolerateStrategy.effective(input, err);
    }
  }
}

module.exports = MassTaskBase;
