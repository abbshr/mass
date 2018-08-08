const cronParser = require("cron-parser");

class MassTaskScheduler extends require("./scheduler.base") {
  get SCHED_FLAGS() {
    return {
      SIGNAL: "signal",
      FUTURE: "future",
      PERIODIC: "periodic",
      QUEUED: "queued",
      IMMEDIATE: "immediate",
    };
  }

// ---- BEGIN SCHED METHODS ----
  signal(task, signal, retries = 0) {
    this.bus.listen((sig, payload) => {
      if (sig === signal) {
        this.preemptiveSchedule(this.NICE + 1, task, payload, retries);
      }
    });
  }

  future(task, cronExpr, retries = 0) {
    if (task.canceled) {
      return;
    }

    const nextDate = cronParser.parseExpression(cronExpr).next()._date;
    const duration = nextDate - new Date();
    setTimeout(() => this.preemptiveSchedule(this.NICE + 2, task, nextDate, retries), duration);
  }

  // 不会等待失败任务的重试, 多个任务之间的执行彼此独立
  periodic(task, cronExpr, retries = 0) {
    if (task.canceled) {
      return;
    }

    const nextDate = cronParser.parseExpression(cronExpr).next()._date;
    const duration = nextDate - new Date();
    setTimeout(() => {
      this.preemptiveSchedule(this.NICE + 2, task, nextDate, retries);
      this.periodic(task, cronExpr);
    }, duration);
  }

  immediate(task, input = null, retries = 0) {
    if (task.canceled) {
      return;
    }
    this.preemptiveSchedule(this.NICE + 1, task, input, retries);
  }

  queued(task, input = null, retries = 0) {
    if (task.canceled) {
      return;
    }
    this.schedule(task, "task-queue", input, retries);
  }

  cancel(taskId) {
    const task = this.taskRegistry.get(taskId);

    if (task) {
      task.cancel();
    }
  }
// ---- END SCHED METHODS ----

  // 通过调度器创建任务
  spawnTask(TaskClass, cfg) {
    return (new TaskClass(cfg)).join(this);
  }

  // TODO: 处理死信队列
  failback() {
    return this.deadLetterQueue.start();
  }
}

module.exports = MassTaskScheduler;