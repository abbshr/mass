const operators = require("./operators");
const Gen = require("./state-generator");
const fs = require("fs");
const path = require("path");

// 流处理运算符执行环境
// 提供 pipe 机制, 维护运算符之间上下文, 状态, 资源等信息
class Env extends Promise {
  constructor(ancestorEnv, ...args) {
    // 处理 this.constructor.prototype.then 调用
    // 解释: 因为 then 中会用一个内置 executor 构造一个 new this.constructor(executor)
    // executor 内部将传入的 resolve 和 reject 参数记录到 capability 对象里.
    // 生成新的 promise 后, 检查 capability.resolve 和 capability.reject 方法是否存在,
    // 如果不存在则抛出错误. 因此要将 then 的 executor 同步执行.
    // if (typeof ancestorEnv === "function") {
    //   super(ancestorEnv);
    //   return this;
    // }
    // 如果非函数, then 调用则发生值穿透.

    // 环境对象内的运算符状态决定对象的状态
    super((resolve, reject) => {
      process.nextTick(() => this.unwrap().then(resolve).catch(reject));
    });

    this._args = args;

    // 祖先环境对象
    this.ancestor = ancestorEnv;

    // 记录原始类
    this.class = this.constructor;

    // 当前作用域, 表示当前环境里运算符的影响范围.
    // 用于维护进程内逻辑多播 (shard) 的子运算符执行环境
    this.scope = new Set();

    // 默认的算子计算中间态存储器/聚合器
    // this.StateClass = states.State;

    // 是否是操作符环境
    // this.openv = true;

    this.exited = false;
    this._success = null;
    this._failure = null;

    // 无需在子类中处理 then 调用
    this.constructor = Promise;
  }

  // 生成 env 的及其所有后继 env 的拷贝树.
  clone() {
    const copy = new this.class(this.ancestor, ...this._args);

    for (let env of this.scope) {
      copy.scope.add(env.clone());
    }

    return copy;
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

  async unwrap() {
    if (this._op) {
      return new Promise((resolve, reject) => {
        this._op.once("operator_close", err => {
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

  // 通过 env 来做 pipe.
  // 将子环境添加到当前作用域
  // 调用两个环境中的运算符的 pipe 方法完成关联,
  // 并返回当前环境
  pipe(env) {
    this.scope.add(env);

    // end: false, 防止仍然有前驱的运算符受到影响
    this._op && this._op.pipe(env._op, { end: false });
    return env;
  }

  fusion(op) {
    this._op = op;
    op.env = this;
  }

  // 为 _op 指定一个状态存储, 并返回状态生成器
  use(StateClass, cfg) {
    if (!this._op instanceof this.operators.Calculator) {
      throw new Error("只能给 Calculator 算子及其子类的实例配置状态");
    }

    this.stateGenerator = new Gen(StateClass, cfg);
    return this.stateGenerator;
  }
}

// 加载 Env 类原型方法
fs.readdirSync(path.join(__dirname, "subenv")).forEach(filename => {
  const envPath = path.join(__dirname, "subenv", filename);
  require(envPath)(Env);
  console.log("加载环境对象:", envPath);
});

module.exports = Env;
