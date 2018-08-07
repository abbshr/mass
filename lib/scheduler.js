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
  // TODO: 区分一次性和重复信号
  signal(task, signal) {
    const listener = () => {
      this.bus.listen((sig, payload) => {
        if (sig === signal) {
          this.preemptiveSchedule(this.NICE + 1, task, payload);
        }
      });
    };

    if (this.bus.inited) {
      listener();
    } else {
      this.bus.once("inited", listener);
    }
  }

  future(task, cronExpr) {
    if (task.canceled) {
      return;
    }

    const duration = cronParser.parseExpression(cronExpr).next()._date - new Date();
    setTimeout(() => this.preemptiveSchedule(this.NICE + 2, task, null), duration);
  }

  // 不会等待失败任务的重试, 多个任务之间的执行彼此独立
  periodic(task, cronExpr) {
    if (task.canceled) {
      return;
    }

    const duration = cronParser.parseExpression(cronExpr).next()._date - new Date();
    setTimeout(() => {
      this.preemptiveSchedule(this.NICE + 2, task, null);
      this.periodic(task, cronExpr);
    }, duration);
  }

  immediate(task) {
    if (task.canceled) {
      return;
    }
    this.preemptiveSchedule(this.NICE + 1, task, null);
  }

  queued(task) {
    if (task.canceled) {
      return;
    }
    this.schedule(task, "task-queue", null);
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

  // TODO: 通用容错接口
  faultTolerate(task, input, retries, err) {
    // 默认策略: 重新调度
    return this.retry(task, input, retries, err);
  }

  // TODO: 处理死信队列
  failback() {
    return this.deadLetterQueue.start();
  }
}

module.exports = MassTaskScheduler;