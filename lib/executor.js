const Mutex = require("./components/mutex");

class Executor {
  constructor(scheduler, task, input) {
    this.scheduler = scheduler;
    this.task = task;

    // task.executor 执行参数
    this.input = input;
    this.mutex = null;

    return () => this.run();
  }

  // task 的物理执行实体, 内部调用了 task.executor
  async run() {
    const { task, input } = this;

    if (!task.executor) {
      throw new Error(`task <id: ${task.taskId}, name: ${task.taskName}> has no executor defined`);
    }

    if (task.canceled) {
      return;
    }

    if (task.retries > 0) {
      console.log(`第 ${task.retries} 次重试任务 <id: ${task.taskId}, name: ${task.taskName}>, 关联数据:`, input);
    }

    await this.beforeTask();
    const error = await this.runTaskExecutor();
    await this.afterTask(error);
  }

  async beforeTask() {
    const { task, scheduler } = this;

    // 任务开始执行时注册到注册表
    scheduler.register(task);

    // 设置任务状态为运行
    task.state = task.STATE.RUN;

    // 1. 处理任务执行标记
    if (task.executeFlag === task.EXECUTE_FLAGS.MUTEX) {
      // 创建 Mutex 对象
      this.createMutex();
      // 申请互斥锁
      // 申请成功后定期续租
      if (!await this.acquireMutex()) {
        // 设置任务状态
        task.state = task.STATE.WAIT_MUTEX;
        // 由于下次调度, 暂时移出注册表
        scheduler.unregister(task);
        // 2. 处理任务属性
        this.handleRepeatTask();
      }
    }
  }

  async afterTask(error) {
    const { input, task } = this;

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
      this.handleRepeatTask();
    } else if (task.state === task.STATE.FAILURE) {
      // 撤销状态变更
      await task.resetStore();
      // 任务可能重试或者加入 dlq, 因此在具体场景更新状态
      await task.faultTolerate(input, error);
    }
  }

  async runTaskExecutor() {
    const { input } = this;
    const { task, scheduler } = this;

    let error = null;
    if (task.state === task.STATE.WAIT_MUTEX) {
      return error;
    }

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
      if (this.mutex) {
        await this.freeMutex();
      }
      // 执行体结束后将任务从注册表里移除
      scheduler.unregister(task);
    }

    return error;
  }

  // 处理子任务
  proceed(ret) {
    const { scheduler, task } = this;

    for (let subTask of task.childTasks) {
      scheduler.schedule(subTask, { ...ret });
    }

    for (let subTask of task.childTasksGroup) {
      ret.forEach(item => scheduler.schedule(subTask, { ...item }));
    }
  }

  handleRepeatTask() {
    const { task, scheduler } = this;

    if (task.attr === task.ATTRS.REPEATABLE && task.schedFlag !== scheduler.SCHED_FLAGS.PERIODIC) {
      // 根据调度 flag 重新加入调度队列
      scheduler[task.schedFlag](task, task.args);
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
      await mutex.free();
    } catch (err) {
      console.log("任务", task, "释放资源出错", task.resourceId, err);
    }
  }
}

module.exports = Executor;