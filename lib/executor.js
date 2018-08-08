const Mutex = require("./components/mutex");

class Executor {
  constructor(scheduler, task, args) {
    this.scheduler = scheduler;
    this.task = task;

    // task.executor 执行参数
    this.args = args;
    this.mutex = null;

    return () => this.run();
  }

  async run() {
    const { input, retries } = this.args;
    const { task, scheduler } = this;
    let error = null;

    if (!task.executor) {
      throw new Error(`task <id: ${task.taskId}, name: ${task.taskName}> has no executor defined`);
    }

    // task 的物理执行实体, 内部调用了 task.executor
    if (task.canceled) {
      return;
    }

    // 1. 处理任务执行标记
    if (task.executeFlag === task.EXECUTE_FLAGS.MUTEX) {
      // 创建 Mutex 对象
      // TODO: 参数传入
      // this.mutex = new Mutex(redis, this.resourceId, this.mutexConfig);
      this.createMutex();
      // 申请互斥锁
      // 申请成功后定期续租
      if (!await this.acquireMutex()) {
        // 设置任务状态
        task.state = task.STATE.WAIT_MUTEX;
        // 2. 处理任务属性
        this.handleRepeatTask(retries);
        return;
      };
    }

    // 任务开始执行时注册到注册表
    scheduler.register(task);
    scheduler.retryNotice(input, retries, task);

    // 设置任务状态为运行
    task.state = task.STATE.RUN;

    try {
      // 每次执行任务时重新初始化状态存储.
      await task.initStore();
      await task.executor(input, (ret) => this.proceed(ret), scheduler.bus);

      // 任务完成后设置状态为完成
      task.state = task.STATE.FINISH;
    } catch (err) {
      error = err;
      task.state = task.STATE.FAILURE;
    } finally {
      // 释放资源锁
      await this.freeMutex();
      // 执行体结束后将任务从注册表里移除
      scheduler.unregister(task);
    }

    // 任务执行完成后, 提交临时状态
    if (task.state === task.STATE.FINISH) {
      try {
        await task.commitStore();
      } catch (err) {
        // 撤销状态变更
        await task.resetStore();
        console.log("任务状态存储提交失败:", err, "相关任务:", task, "输入数据", input);
      }

      // 2. 处理任务属性
      this.handleRepeatTask(retries);
    } else {
      // 撤销状态变更
      await task.resetStore();
      // 任务可能重试或者加入 dlq, 因此在具体场景更新状态
      await task.faultTolerate(input, retries, error);
    }
  }

  // 处理子任务
  proceed(ret) {
    const { scheduler, task } = this;

    for (let subTask of task.childTasks) {
      scheduler.schedule(subTask, "task-queue", { ...ret });
    }

    for (let subTask of task.childTasksGroup) {
      ret.forEach(item => scheduler.schedule(subTask, "task-queue", { ...item }));
    }
  }

  handleRepeatTask(retries = 0) {
    const { task, scheduler } = this;

    if (task.attr === task.ATTRS.REPEATABLE && task.schedFlag !== scheduler.SCHED_FLAGS.PERIODIC) {
      // 根据调度 flag 重新加入调度队列
      scheduler[task.schedFlag](task, task.args, retries);
    }
  }

  createMutex() {
    this.mutex = new Mutex(this.task.resourceId);
  }

  async acquireMutex() {
    const { task, mutex } = this;

    const err = await mutex.acquire();
    if (err) {
      console.log("Task", task, "未取得互斥锁", task.resourceId, err);
      return false;
    }

    return true;
  }

  async freeMutex() {
    const { task, mutex } = this;

    try {
      mutex && await mutex.free();
    } catch (err) {
      console.log("任务", task, "释放资源出错", task.resourceId, err);
    }
  }
}

module.exports = Executor;