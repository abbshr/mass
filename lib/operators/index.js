const fs = require("fs");
const path = require("path");

// 流计算操作符统一导出接口
const ops = {
  // 输入操作符
  Source: require("./source"),

  // 输出操作符
  Sink: require("./sink"),

  // 算子操作符
  Calculator: require("./calculator"),
};
Reflect.setPrototypeOf(ops, null);

const manager = {
  getall() { return ops },

  // 每个操作符都需要注册名字和类之间的映射关系
  register(operatorName, OperatorClass) {
    if (Object.keys(this).includes(operatorName)) {
      throw new Error(`不能以内置方法名 <${operatorName}> 作为操作符类名`);
    }

    ops[operatorName] = OperatorClass;
    console.log("已注册操作符", `<${operatorName}>`, "class:", OperatorClass.name);
  },
};

module.exports = new Proxy(
  manager,
  {
    get(target, operatorName) {
      if (Object.keys(manager).includes(operatorName)) {
        return target[operatorName];
      }

      if (!ops[operatorName]) {
        throw new Error(`操作符 <${operatorName}> 尚未实现, 或未找到对应类.`);
      }

      return ops[operatorName];
    }
  }
);

// 在所有操作符 (除了 Source/Sink/Calculator 之外) 使用前, 必须完成加载
["sources", "sinks", "calculators"].forEach(dir => {
  const dirname = path.join(__dirname, "..", dir);
  fs.readdirSync(dirname).forEach(filename => require(path.join(dirname, filename))(module.exports));
});