module.exports = strategies => {
  class DefaultFaultTolerateStrategy extends strategies.FaultTolerateStrategy {
    async effective(input, err) {
      this.attemp(input, err);
    }

    // 任务失败后以 queued 策略重新调度
    handleTaskFailure(input) {
      this.task.scheduler.queued(this, input);

      console.log(`已将任务 <id: ${this.task.taskId}, name: ${this.task.taskName}> 重新压入调度队列, 关联数据:`, input, `等待第 ${this.task.retries} 次重试. 当前排队任务数量: ${this.task.scheduler.pendTaskCount}`);
    }

    // 任务死亡达到最大重调度次数时, 加入 dlq
    handleTaskDead(input) {
      console.log(`任务 <id: ${this.task.taskId}, name: ${this.task.taskName}> 已达到最大重试次数`);

      this.task.scheduler.queuedDeadTask(this, input);

      console.log(`已将任务 <id: ${this.task.staskId}, name: ${this.task.taskName}> 压入 deadLetterQueue 队列, 关联数据:`, input, "队列长度:", this.task.scheduler.deadTaskCount);
    }
  
    // 任务重试策略: 重调度或加入 dlq
    attemp(input, err) {
      this.task.retries++;

      console.log(`任务 <id: ${this.task.taskId}, name: ${this.task.taskName}> 第 ${this.task.retries} 次执行失败, 由于错误: ${err && err.message}. 关联数据:`, input, err);

      if (this.task.retries > (this.task.maxRetryTimes || this.task.scheduler.maxRetryTimes)) {
        this.handleTaskDead(input);
      } else {
        this.handleTaskFailure(input);
      }
    }
  }

  strategies.register("DefaultFaultTolerateStrategy", DefaultFaultTolerateStrategy);
};