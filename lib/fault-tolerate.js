const fs = require("fs");
const path = require("path");
const applog = require("./applog");
const syslog = require("./syslog");

const strategies = {
  FaultTolerateStrategy: class FaultTolerateStrategy {
    constructor(task) {
      this.log = applog.child({ module: `[${this.constructor.name}]` });
      // this.deadLetterQueue = [];//new Queue({ autoStart: false });
      this.task = task;
    }

    async effective(input, err) {}

    // // TODO: 处理死信队列
    // failback() {
    //   // return this.deadLetterQueue.start();
    // }

    // get deadTaskCount() {
    //   return this.deadLetterQueue.length;
    // }

    // queuedDeadTask(input) {
    //   // 任务加入 dlq 时, 状态变为死亡
    //   if (this.task.state === this.task.STATE.FAILURE) {
    //     this.task.state = this.task.STATE.DEAD;
    //     this.enqDeadLetterQueue(this.task.createTaskExecutor(input));
    //   }
    // }

    // // 将失败的物理执行体加入 dlq
    // enqDeadLetterQueue(fn) {
    //   return this.task.scheduler.deadLetterQueue.add(fn);
    // }
  },
};
Reflect.setPrototypeOf(strategies, null);

const manager = {
  getall() { return strategies },

  // 每个操作符都需要注册名字和类之间的映射关系
  register(strategyName, StrategyClass) {
    if (Object.keys(this).includes(strategyName)) {
      throw new Error(`不能以内置方法名 <${strategyName}> 作为容错策略类名`);
    }

    strategies[strategyName] = StrategyClass;
    syslog.info("已注册容错策略类", `<${strategyName}>`, "class:", StrategyClass.name);
  },
};

module.exports = new Proxy(
  manager,
  {
    get(target, strategyName) {
      if (Object.keys(manager).includes(strategyName)) {
        return target[strategyName];
      }

      if (!strategies[strategyName]) {
        throw new Error(`状态存储 <${strategyName}> 尚未实现, 或未找到对应类.`);
      }

      return strategies[strategyName];
    }
  }
);

const dirname = path.join(__dirname, "fault-tolerate-strategies");
fs.readdirSync(dirname).forEach(filename => require(path.join(dirname, filename))(module.exports));