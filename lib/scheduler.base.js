const Queue = require("p-queue");
const MassBus = require("./bus");
const Mutex = require("./components/mutex");

class MassTaskSchedulerBase {
  constructor({ concurrency = 1, maxRetryTimes = 5, busConfig }) {
    // 默认的单个任务失败后的最大重调度次数
    this.maxRetryTimes = +maxRetryTimes;

    // 用 task-id 记录添加到该调度器上的任务
    this.taskRegistry = new Map();

    // 默认的优先级
    this.NICE = 0;

    // TODO: 持久化队列
    this.taskQueue = new Queue({ concurrency, autoStart: false });
    this.deadLetterQueue = new Queue({ concurrency, autoStart: false });

    // 调度器的消息总线
    this.bus = new MassBus(busConfig);
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

    let executor = () => this.createTaskExecutor(task)(input, retries);

    if (queue === "task-queue") {
      // 任务添加到等待队列(待调度)时, 状态变为就绪
      task.state = task.STATE.READY;
      this.enq(executor, priority);
    } else if (queue === "dead-letter-queue") {
      // 任务加入 dlq 时, 状态变为失败
      task.state = task.STATE.FAILURE;
      this.enqDeadLetterQueue(executor);
    }
  }

  // 生成 task 的物理执行体
  // task.taskId 必须存在
  // 如果有子任务, 会在这里进行检查和传播建立
  createTaskExecutor(task) {
    if (!task.executor)
      throw new Error(`task <id: ${task.taskId}, name: ${task.taskName}> has no executor defined`);

    // 后续子任务的调度处理
    const proceed = (ret) => {
      for (let subTask of task.childTasks) {
        this.schedule(subTask, "task-queue", { ...ret });
      }

      for (let subTask of task.childTasksGroup) {
        ret.forEach(item => this.schedule(subTask, "task-queue", { ...item }));
      }
    };

    // task 的物理执行实体, 内部调用了 task.executor
    return async (input, retries = 0) => {
      if (task.canceled) {
        return;
      }

      // let heartbeatRef = null;
      let mutex = null;

      // 1. 处理任务执行标记
      if (task.executeFlag === task.EXECUTE_FLAGS.MUTEX) {
        // 创建 Mutex 对象
        // TODO: 参数传入
        mutex = new Mutex(keeper, task.resourceId, MutexConfig);
        // 申请互斥锁
        // 申请成功后定期续租
        if (!await this.acquireMutex(task, mutex)) return;
      }

      // 任务开始执行时注册到注册表
      this.register(task);
      this.retryNotice(input, retries, task);

      // 设置任务状态为运行
      task.state = task.STATE.RUN;

      try {
        // 每次执行任务时重新初始化状态存储.
        await task.initStore();
        await task.executor(input, proceed, this.bus);

        // 任务完成后设置状态为完成
        task.state = task.STATE.FINISH;

        // 2. 处理任务属性
        this.handleRepeatTask();
      } catch (err) {
        // 任务可能重试或者加入 dlq, 因此在具体场景更新状态
        this.faultTolerate(task, input, retries, err);
      } finally {
        // 释放资源锁
        await this.freeMutex(task, mutex);
      }

      // 任务执行完成后, 提交临时状态
      if (task.state === task.STATE.FINISH) {
        try {
          await task.commitStore();   
        } catch (err) {
          // 撤销状态变更
          task.resetStore();
          console.log("任务状态存储提交失败:", err, "相关任务:", task, "输入数据", input);
        }
      } else {
        // 撤销状态变更
        task.resetStore();
      }

      // 执行体结束后将任务从注册表里移除
      this.unregister(task);
    }
  }

  handleRepeatTask(task) {
    if (task.attr === task.ATTRS.REPEATABLE && task.schedFlag !== this.SCHED_FLAGS.PERIODIC) {
      // 根据调度 flag 重新加入调度队列
      // TODO: 保留上下文 (retries)
      this[task.schedFlag](task, task.args);
    }
  }

  async acquireMutex(task, mutex) {
    const err = await mutex.acquire();
    if (err) {
      console.log("Task", task, "未取得互斥锁", task.resourceId, err);

      // 设置任务状态
      task.state = task.STATE.WAIT_MUTEX;

      // 2. 处理任务属性
      this.handleRepeatTask(task);
      return false;
    }

    return true;
  }

  async freeMutex(task, mutex) {
    try {
      mutex && await mutex.free();
    } catch (err) {
      console.log("任务", task, "释放资源出错", task.resourceId, err);
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
    console.log("初始化消息总线…");
    // 调度器的消息总线初始化
    await this.bus.init();
    console.log("开始任务调度…");
    this.taskQueue.start();
  }

  // 重调度
  reSchedule(task, input, retries) {
    this.schedule(task, "task-queue", input, retries);
    console.log(`已将任务 <id: ${task.taskId}, name: ${task.taskName}> 重新压入调度队列, 关联数据:`, input, `等待第 ${retries} 次重试. 当前排队任务数量: ${this.taskQueue.size}`);
  }

  // 任务失败达到最大重调度次数时, 加入 dlq
  handleTaskFailure(task, input) {
    console.log(`任务 <id: ${task.taskId}, name: ${task.taskName}> 已达到最大重试次数`);
    this.schedule(task, "dead-letter-queue", input);
    console.log(`已将任务 <id: ${task.taskId}, name: ${task.taskName}> 压入 deadLetterQueue 队列, 关联数据:`, input);
  }

  // 任务重试策略: 重调度或加入 dlq
  retry(task, input, retries, err) {
    console.log(`任务 <id: ${task.taskId}, name: ${task.taskName}> 第 ${retries + 1} 次执行失败, 由于错误: ${err && err.message}. 关联数据:`, err, input);
    retries++;

    if (retries > (task.maxRetryTimes || this.maxRetryTimes)) {
      this.handleTaskFailure(task, input);
    } else {
      this.reSchedule(task, input, retries);
    }
  }

  // 等待调度器空闲
  async onIdle() {
    return this.taskQueue.onIdle();
  }

  retryNotice(input, retries, task) {
    retries > 0 && console.log(`第 ${retries} 次重试任务 <id: ${task.taskId}, name: ${task.taskName}>, 关联数据:`, input);
  }
}

module.exports = MassTaskSchedulerBase;