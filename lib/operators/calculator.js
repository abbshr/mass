const { Transform } = require("stream");
const { MassElement } = require("../components/element");

class Calculator extends Transform {
  constructor(env) {
    super({ readableObjectMode: true, writableObjectMode: true });

    // 流计算环境对象
    this.env = env;

    // 记录前驱运算符数量
    this.prevCount = 0;

    this._setupEventListeners();
  }

  _setupEventListeners() {
    this.once("finish", () => this._onFinish());
    this.once("error", err => this._onError(err));

    this.on("pipe", () => this.prevCount++);
    this.on("unpipe", () => {
      this.prevCount--;

      // 当已经没有前驱时, 关闭运算符
      this.prevCount || this.end();
    });
  }

  _onError(err) {
    // 解除与所有后继运算符的连接
    this.unpipe();
    this._errorHandle(err);
  }
  _onFinish() {
    if (!this._writableState.errorEmitted) {
      this._doneHandle();
    }
  }

  // 所有 Calculator 都需要实现该方法
  async calc(elem) {
    throw new Error(`没有在类 [${this.constructor.name}] 中找到 calc(elem) 方法的对应实现`);
  }

  failback(err, callback) {
    callback(err);
  }

  // 停止
  terminate() {
    this.end();
    this.push(null);
  }

  setReducer(fn) {
    this.reduce = fn;
  }

  product(d) {
    // 输出前调用聚合函数
    return this.push(new MassElement(this.reduce(d)));
  }

  reduce(d) {
    return d;
  }

  // 创建新的中间计算状态存储区
  // 保存计算中间状态
  createStateStore() {
    if (this.env.stateGenerator) {
      return this.env.stateGenerator.createStateStore();
    } else {
      return this.env.states.State();
    }
  }

  _transform(elem, encoding, callback) {
    this.calc(elem)
      .then(() => callback(null))
      .catch((err) => this.failback(err, callback));
  }

  // _flush(callback) {
  //   this.done()
  //     .then(() => callback(null))
  //     .catch((err) => this.failback(err, callback));
  // }
}

Object.assign(Calculator.prototype, require("./base"));
Object.assign(Calculator, require("./base-static"));
module.exports = Calculator;