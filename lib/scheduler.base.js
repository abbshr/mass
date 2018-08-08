const Queue = require("p-queue");
const MassBus = require("./components/bus");

class MassTaskSchedulerBase {
  constructor({ concurrency = 1, maxRetryTimes = 5 } = {}) {

    // 默认的单个任务失败后的最大重调度次数
    this.maxRetryTimes = +maxRetryTimes;

    // 用 task-id 记录添加到该调度器上的任务
    this.taskRegistry = new Map();
    // TODO
    // this.taskRegistryTable = new RegistryTable();

    // 默认的优先级
    this.NICE = 0;

    // TODO: 持久化队列
    this.taskQueue = new Queue({ concurrency, autoStart: false });
    this.deadLetterQueue = new Queue({ concurrency, autoStart: false });

    // 调度器的消息总线
    this.bus = new MassBus();
  }

  // 向调度器注册正在执行的任务
  register(task) {
    if (!task.taskId) {
      throw new Error("Task 缺少 id", task);
    }

    if (this.taskRegistry.has(task.taskId)) {
      return console.log(`task id <${task.taskId}> has been registered`);
    }

    this.taskRegistry.set(task.taskId, task);
  }

  unregister(task) {
    if (!task.taskId) {
      return console.log(`task id not found:`, task);
    }

    this.taskRegistry.delete(task.taskId);
  }

  // 抢占式调度
  preemptiveSchedule(priority, task, input, retries) {
    this._sched(priority, task, "task-queue", input, retries);
  }

  // 顺序调度
  schedule(task, queue, input, retries) {
    this._sched(this.NICE, task, queue, input, retries);
  }

  _sched(priority, task, queue, input, retries) {
    if (task.canceled) {
      return;
    }

    let executor = task.createExecutor({ input, retries });

    if (queue === "task-queue") {
      // 任务添加到等待队列(待调度)时, 状态变为就绪
      task.state = task.STATE.READY;
      this.enq(executor, priority);
    } else if (queue === "dead-letter-queue") {
      // 任务加入 dlq 时, 状态变为失败
      task.state = task.STATE.DEAD;
      this.enqDeadLetterQueue(executor);
    }
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
  // 初始化一些资源
  async bootstrap() {
    // console.log("初始化消息总线…");
    // 调度器的消息总线初始化
    // await this.bus.init();
    console.log("开始任务调度…");
    this.taskQueue.start();
  }

  // 等待调度器空闲
  async onIdle() {
    return this.taskQueue.onIdle();
  }
}

module.exports = MassTaskSchedulerBase;