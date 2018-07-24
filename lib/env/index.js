const operators = require("../operators");

// 流处理运算符执行环境
// 提供 pipe 机制, 维护运算符之间上下文
class Env {
  constructor(cfg) {
    this.cfg = { ...cfg };

    // 当前作用域, 表示当前环境里运算符的影响范围.
    // 用于维护进程内逻辑多播 (shunt) 的子运算符执行环境
    this.scope = new Set();
  }

  // 该环境中的运算符实体
  get op() { return this._op; }

  get operators() { return operators.getall(); }
  static get operators() { return operators.getall(); }

  // 通过 env 来做 pipe.
  // 将子环境添加到当前作用域
  // 调用两个环境中的运算符的 pipe 方法完成关联,
  // 并返回当前环境
  pipe(env) {
    this.scope.add(env);
    this._op && this._op.pipe(env._op);
    return env;
  }

  fusion(op) {
    this._op = op;
  }

  // // 声明输入
  // from(source) {
  //   if (source instanceof operators.Source)
  //     return this.pipe(new SourceEnv(source));
  //   throw new Error();
  // }

  // // 声明输出
  // to(sink) {
  //   if (sink instanceof operators.Sink)
  //     return this.pipe(new SinkEnv(sink));
  //   throw new Error();
  // }

  // // 声明窗口运算
  // // TODO
  // windowBy(window) {
  //   if (window instanceof operators.WindowCalculator)
  //     return this.pipe(new WindowEnv(window));
  //   //   const subenv = new WindowEnv(this, type, opts);
  //   throw new Error();
  // }

  // // 声明分组/桶运算
  // groupBy(...groupNames) {
  //   return this.pipe(new GroupEnv(this, ...groupNames));
  // }

  // // 声明分流/多播
  // shunt(traitFn) {
  //   return this.pipe(new ShuntEnv(this, traitFn));
  // }

  // // 声明聚合/产出运算
  // product(sketch) {
  //   return this.pipe(new ProductEnv(this, sketch));
  // }

  // 打开查看一个管道里的数据流
  // 一般目的用于开发新的 op 或调试 op 时使用
  tap(probeFn) {
    return this.pipe(new TapEnv(this, probeFn));
  }

  generate() {
    return this.pipe(new GeneratorEnv(this));
  }

  check(validator) {
    return this.pipe(new CheckEnv(this, validator));
  }
}

// envs defined
Env.TapEnv = require("./tap")(Env);
Env.CheckEnv = require("./check")(Env);
Env.GeneratorEnv = require("./generator")(Env);
// const ShuntEnv = require("./shunt")(Env);

module.exports = Env;

// class WindowEnv extends Env {
//   constructor(env, type, opts) {
//     this._op = operators.WindowCalculator.create(env, type, opts);
//   }

//   triggerClassGenerator(op, reducer) {
//     return state => class Trigger {
//       constructor() {
//         this.windowCalculator = op;
//         this.window = window;
//         this.state = state;
//       }

//       onInsertElement(elem, time) {
//         reducer(this.state, { elem, time });
//       }

//       onWindowExpired() {
//         this.windowCalculator.product(this.state);
//       }
//     }
//   }

//   // .incremental(GroupTrigger, new Map)
//   incremental(TriggerClass, initialState) {
//     this.op.setElemTrigger(TriggerClass, initialState);
//     return this;
//   }

//   // // TODO: 窗口聚合函数
//   // addIncrementalAggregrate(initialState, reducer) {
//   //   const createTriggerClass = this.triggerClassGenerator(this.op, reducer);
//   //   this.op.setElemTrigger(createTriggerClass(initialState));
//   //   return this;
//   // }

//   // addIncrementalGroupBy(...groupNames) {

//   //   // const subenv = new GroupEnv(this, ...groupNames);
//   //   // return this.pipe(subenv);
//   //   return this;
//   // }
// }

// class GroupEnv extends Env {
//   constructor(env, ...groupNameAssigner) {
//     if (typeof groupNameAssigner[0] === "function")
//       [groupNameAssigner] = groupNameAssigner;

//     this._op = new operators.GroupByCalculator(env, groupNameAssigner);
//   }
// }

// class ProductEnv extends Env {
//   constructor(env, sketch) {
//     this._op = new operators.ProductCalculator(env, sketch);
//   }
// }

// class SourceEnv extends Env {

// }

// class SinkEnv extends Env {

// }
