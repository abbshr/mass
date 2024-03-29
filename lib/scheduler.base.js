const Queue = require("p-queue");
const MassBus = require("./components/bus");
const applog = require("./applog");

class MassTaskSchedulerBase {
  constructor({ concurrency = 1, maxRetryTimes = 5 } = {}) {
    this.log = applog.child({ module: `[${this.constructor.name}]` });

    // 默认的单个任务失败后的最大重调度次数
    this.maxRetryTimes = +maxRetryTimes;
    this.concurrency = +concurrency;

    this.taskRegistry = new Set();
    // TODO
    // this.taskRegistryTable = new RegistryTable();

    // 默认的优先级
    this.NICE = 0;

    // TODO: 持久化队列
    this.taskQueue = new Queue({ concurrency, autoStart: true });
    this.deadLetterQueue = new Queue({ concurrency, autoStart: false });
    // this.deadLetterQueue = [];

    // 调度器的消息总线
    this.bus = new MassBus();
  }

  // 向调度器注册正在执行的任务
  register(task) {
    this.taskRegistry.add(task);
  }

  unregister(task) {
    this.taskRegistry.delete(task);
  }

  // 抢占式调度
  preemptiveSchedule(priority, task, input) {
    this._sched(priority, task, input);
  }

  // 顺序调度
  schedule(task, input) {
    this._sched(this.NICE, task, input);
  }

  queuedDeadTask(task, input) {
    // 任务加入 dlq 时, 状态变为死亡
    if (task.state === task.STATE.FAILURE) {
      task.state = task.STATE.DEAD;
      this.enqDeadLetterQueue(task.createExecutor(input));
    }
  }

  _sched(priority, task, input) {
    if (task.canceled) {
      return;
    }

    // 任务添加到等待队列(待调度)时, 状态变为就绪
    task.state = task.STATE.READY;
    this.enq(task.createExecutor(input), priority);
  }

  // 将物理执行体加入等待队列
  enq(fn, priority) {
    return this.taskQueue.add(fn, { priority });
  }

  // 将失败的物理执行体加入 dlq
  enqDeadLetterQueue(fn) {
    return this.deadLetterQueue.add(fn);
  }

  // 启动调度器
  resume() {
    this.log.info("恢复任务调度…");
    this.taskQueue.start();
  }

  pause() {
    this.log.info("暂停任务调度");
    this.taskQueue.pause();
  }

  // 等待调度器空闲
  async onIdle() {
    return this.taskQueue.onIdle();
  }
}

module.exports = MassTaskSchedulerBase;