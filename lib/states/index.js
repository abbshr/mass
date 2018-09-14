const fs = require("fs");
const path = require("path");
const getSyslog = require("../syslog");

// 流计算操作符统一导出接口
const states = {
  State: require("./state"),
  StateAggregator: require("./state-aggregator"),
};
Reflect.setPrototypeOf(states, null);

const manager = {
  getall() { return states },

  // 每个操作符都需要注册名字和类之间的映射关系
  register(stateName, StateClass) {
    if (Object.keys(this).includes(stateName)) {
      throw new Error(`不能以内置方法名 <${stateName}> 作为状态类名`);
    }

    states[stateName] = StateClass;
    getSyslog().info("已注册状态存储 <%s>, class: %s", stateName, StateClass.name);
  },
};

module.exports = new Proxy(
  manager,
  {
    get(target, stateName) {
      if (Object.keys(manager).includes(stateName)) {
        return target[stateName];
      }

      if (!states[stateName]) {
        throw new Error(`状态存储 <${stateName}> 尚未实现, 或未找到对应类.`);
      }

      return states[stateName];
    }
  }
);

const dirname = path.join(__dirname, "..", "state-aggregators");
fs.readdirSync(dirname).forEach(filename => require(path.join(dirname, filename))(module.exports));