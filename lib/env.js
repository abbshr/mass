const operators = require("./operators");
const Gen = require("./gen");
const fs = require("fs");
const path = require("path");
const applog = require("./applog");
const syslog = require("./syslog");

// 流处理运算符执行环境
// 提供 pipe 机制, 维护运算符之间上下文, 状态, 资源等信息
class Env extends Promise {
  constructor(ancestorEnv, ...args) {
    // 环境对象内的运算符状态决定对象的状态
    super((resolve, reject) => {
      process.nextTick(() => {
        this._op && this._op.once("operator_close", err => {
          this.exited = true;
          if (err) {
            this.failure = true;
            reject(err);
          } else {
            this.success = true;
            resolve(null);
          }
        });
      });
    });

    this._args = args;

    // 祖先环境对象
    this.ancestor = ancestorEnv;

    // 记录原始类
    this.class = this.constructor;
    this.superClass = Env;

    // 当前作用域, 表示当前环境里运算符的影响范围.
    // 用于维护进程内逻辑多播 (shard) 的子运算符执行环境
    this.scope = new Set();

    this.exited = false;
    this._success = null;
    this._failure = null;

    // 无需在子类中处理 then 调用
    this.constructor = Promise;

    this.log = applog.child({ module: `[${this.class.name}]` });
  }

  get success() {
    return this._success;
  }
  set success(p) {
    // this.exited = true;
    return this._success = p;
  }

  get failure() {
    return this._failure;
  }
  set failure(p) {
    // this.exited = true;
    return this._failure = p;
  }

  static get operators() {
    return operators.getall();
  }

  static get states() {
    return Gen.states;
  }

  set offsetManager(offsetManager) {
    return this._offsetStore = offsetManager;
  }

  /**
   * 有回溯查找开销.
   * 建议运算符内缓存 offsetManager 对象
   */
  get offsetManager() {
    if (this._offsetStore) {
      return this._offsetStore;
    } else if (this.ancestor) {
      return this.ancestor.offsetManager;
    }
  }

  // 该环境中的运算符实体
  get op() {
    return this._op;
  }

  get operators() {
    return operators.getall();
  }

  get states() {
    return Gen.states;
  }

  // 返回 op 的状态聚合链上的最后一个 gen.
  get gen() {
    if (this._op) {
      return this._op.lastStateGenerator;
    }
  }

  // // 生成 env 的及其所有后继 env 的拷贝树.
  // // 待检测验证
  // clone() {
  //   const copy = new this.class(this.ancestor, ...this._args);
  //   copy.fusion(copy.op.clone());

  //   for (let env of this.scope) {
  //     copy.scope.add(env.clone());
  //   }

  //   return copy;
  // }

  // 通过 env 来做 pipe.
  // 将子环境添加到当前作用域
  // 调用两个环境中的运算符的 pipe 方法完成关联,
  // 并返回当前环境
  pipe(env) {
    this.scope.add(env);

    // end: false, 防止仍然有前驱的运算符受到影响
    if (this._op) {
      this._op.pipe(env._op, { end: false });
      // operators Map
      // this.offsetManager.opmap.connect(this._op, env._op);
    }

    return env;
  }

  pipeline(fn) {
    if (this.op instanceof this.operators.ShardCalculator) {
      this.op.pipeline(fn);
    } else {
      throw new Error("pipeline(fn) 只能被 ShardCalculator 调用");
    }

    return this;
  }

  fusion(op) {
    this._op = op;
    op.env = this;
    return this;
  }

  // 为 _op 或父级状态聚合器指定一个状态存储, 返回当前 env
  use(StateClass, ...cfg) {
    if (!this._op instanceof this.operators.Calculator) {
      throw new Error("只能给 Calculator 算子及其子类的实例配置状态");
    }

    this._op.use(StateClass, ...cfg);
    return this;
  }

  // 为 _op 指定聚合函数, 返回当前 env
  reduce(fn) {
    if (!this._op instanceof this.operators.Calculator) {
      throw new Error("只能给 Calculator 算子及其子类的实例配置聚合函数");
    }

    if (typeof fn !== "function") {
      throw new Error("必须提供一个函数作为 reduce(fn) 参数");
    }

    this._op.reduce(fn);
    return this;
  }
}

// 加载 Env 类原型方法
fs.readdirSync(path.join(__dirname, "subenv")).forEach(filename => {
  const envPath = path.join(__dirname, "subenv", filename);
  require(envPath)(Env);
  syslog.info("加载环境对象:", envPath);
});

// 处理 Env 的 unhandledRejection
process.on("unhandledRejection", (reason, p) => {
  if (p.superClass === Env) {
    syslog.error(reason, "未处理的 %s(%s) 对象异常", p.class.name, p._op.constructor.name);
  } else {
    syslog.error(reason, "未处理的 Promise 异常");
  }
});

module.exports = Env;
