const { setTimeout } = require("safe-timers");
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

  get pendTaskCount() {
    return this.taskQueue.size;
  }

  get deadTaskCount() {
    return this.deadLetterQueue.size;
  }

// ---- BEGIN SCHED METHODS ----
  signal(task, signal) {
    this.bus.listen((ctx, sig, payload) => {
      if (sig === signal) {
        this.preemptiveSchedule(this.NICE + 1, task, payload);
      }
    });
  }

  future(task, cronExpr) {
    if (task.canceled) {
      return;
    }

    const nextDate = cronParser.parseExpression(cronExpr).next()._date;
    const duration = nextDate - new Date();
    setTimeout(() => this.preemptiveSchedule(this.NICE + 2, task, nextDate), duration);
  }

  // 不会等待失败任务的重试, 多个任务之间的执行彼此独立
  periodic(task, cronExpr) {
    if (task.canceled) {
      return;
    }

    const nextDate = cronParser.parseExpression(cronExpr).next()._date;
    const duration = nextDate - new Date();
    setTimeout(() => {
      this.preemptiveSchedule(this.NICE + 2, task, nextDate);
      this.periodic(task, cronExpr);
    }, duration);
  }

  immediate(task, input = null) {
    if (task.canceled) {
      return;
    }
    this.preemptiveSchedule(this.NICE + 1, task, input);
  }

  queued(task, input = null) {
    if (task.canceled) {
      return;
    }
    this.schedule(task, "task-queue", input);
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