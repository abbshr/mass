module.exports = strategies => {
  class DefaultFaultTolerateStrategy extends strategies.FaultTolerateStrategy {
    async effective(input, err) {
      this.attemp(input, err);
    }

    // 任务失败后以 queued 策略重新调度
    handleTaskFailure(input) {
      this.task.scheduler.queued(this.task, input);

      this.log.info("已将任务 <id: %s, name: %s> 重新压入调度队列, 关联数据: %o, 等待第 %s 次重试. 当前排队任务数量: %s", this.task.taskId, this.task.taskName, input, this.task.retries, this.task.scheduler.pendTaskCount);
    }

    // 任务死亡达到最大重调度次数时, 加入 dlq
    handleTaskDead(input, err) {
      this.log.error(err, "任务 <id: %s, name: %s> 已达到最大重试次数", this.task.taskId, this.task.taskName);

      this.task.scheduler.queuedDeadTask(this.task, input);

      this.log.info("已将任务 <id: %s, name: %s> 压入 deadLetterQueue 队列, 关联数据: %o 队列长度: %s", this.task.taskId, this.task.taskName, input, this.task.scheduler.deadTaskCount);
    }
  
    // 任务重试策略: 重调度或加入 dlq
    attemp(input, err) {
      this.task.retries++;

      this.log.error(err, "任务 <id: %s, name: %s> 第 %s 次执行失败. 关联数据: %o", this.task.taskId, this.task.taskName, this.task.retries, input);

      if (this.task.retries > (this.task.maxRetryTimes || this.task.scheduler.maxRetryTimes)) {
        this.handleTaskDead(input, err);
      } else {
        this.handleTaskFailure(input);
      }
    }
  }

  strategies.register("DefaultFaultTolerateStrategy", DefaultFaultTolerateStrategy);
};