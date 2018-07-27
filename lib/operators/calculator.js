const { Transform } = require("stream");

class Calculator extends Transform {
  constructor(env, opts) {
    super({ readableObjectMode: true, writableObjectMode: true });

    // 流计算环境对象
    this.env = env;

    // 记录前驱运算符数量
    this.prevCount = 0;

    this._setupEventListeners();
  }

  _setupEventListeners() {
    this.once("end", () => this._onEnd());
    this.once("error", err => this._onError(err));
    this.once("close", () => this._onClose());

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
    this.fatal(err);
    this.emit("operator_error", err, this);
  }
  _onEnd() {
    if (!this._writableState.errorEmitted) {
      this.done();
      this.emit("operator_done", this);
    }
  }
  _onClose() {
    this.emit("operator_close", this);
  }

  // 所有 Calculator 都需要实现该方法
  async calc(elem) {
    throw new Error(`没有在类 [${this.constructor.name}] 中找到 calc(elem) 方法的对应实现`);
  }

  failback(err, callback) {
    callback(err);
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
module.exports = Calculator;