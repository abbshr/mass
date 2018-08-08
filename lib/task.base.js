const TaskStore = require("./components/task-store");
const Executor = require("./executor");
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

    // 任务逻辑使用的状态数据
    this.taskStore = new TaskStore(this.taskId);

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

  // get stopped() {
  //   return [this.STATE.FINISH, this.CANCEL, this.FAILURE].includes(this.state);
  // }

  get canceled() {
    return this.state === this.STATE.CANCEL;
  }

  get running() {
    return this.state === this.STATE.RUN;
  }

  // 生成 task 的物理执行体
  // task.taskId 必须存在
  // 如果有子任务, 会在这里进行检查和传播建立
  createExecutor(args) {
    return new Executor(this.scheduler, this, args);
  }

  // 重调度
  reSchedule(input, retries) {
    this.scheduler.schedule(this, "task-queue", input, retries);
    console.log(`已将任务 <id: ${task.taskId}, name: ${task.taskName}> 重新压入调度队列, 关联数据:`, input, `等待第 ${retries} 次重试. 当前排队任务数量: ${this.taskQueue.size}`);
  }

  // 任务失败达到最大重调度次数时, 加入 dlq
  handleTaskFailure(input) {
    console.log(`任务 <id: ${task.taskId}, name: ${task.taskName}> 已达到最大重试次数`);
    this.scheduler.schedule(this, "dead-letter-queue", input);
    console.log(`已将任务 <id: ${task.taskId}, name: ${task.taskName}> 压入 deadLetterQueue 队列, 关联数据:`, input);
  }

  // 任务重试策略: 重调度或加入 dlq
  retry(input, retries, err) {
    console.log(`任务 <id: ${task.taskId}, name: ${task.taskName}> 第 ${retries + 1} 次执行失败, 由于错误: ${err && err.message}. 关联数据:`, err, input);
    retries++;

    if (retries > (task.maxRetryTimes || this.scheduler.maxRetryTimes)) {
      this.handleTaskFailure(input);
    } else {
      this.reSchedule(input, retries);
    }
  }

  retryNotice(input, retries) {
    retries > 0 && console.log(`第 ${retries} 次重试任务 <id: ${task.taskId}, name: ${task.taskName}>, 关联数据:`, input);
  }
}

module.exports = MassTaskBase;
