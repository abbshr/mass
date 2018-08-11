const fs = require("fs");
const path = require("path");

const strategies = {
  FaultTolerateStrategy: class FaultTolerateStrategy {
    constructor(task) {
      this.task = task;
    }

    async effective(input, err) {}
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
    console.log("已注册容错策略类", `<${strategyName}>`, "class:", StrategyClass.name);
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