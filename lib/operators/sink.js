const { Writable } = require("stream");

// 输出运算符基类
// 继承自 Node Writable Stream
class Sink extends Writable {
  constructor(env, opts) {
    super({ objectMode: true });

    // 流计算环境对象
    this.env = env;

    // 记录前驱运算符数量
    this.prevCount = 0;

    this._setupEventListeners();
  }

  _setupEventListeners() {
    this.once("finish", () => this._onFinish());
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
    this.fatal(err);
    this.emit("operator_error", err);
  }
  _onFinish() {
    if (!this._writableState.errorEmitted) {
      this.done();
      this.emit("operator_done", this);
    }
  }
  _onClose() {
    this.emit("operator_close", this);
  }

  // 所有 Sink 运算符都要实现该方法
  async produce(elems) {
    throw new Error(`没有在类 [${this.constructor.name}] 中找到 produce(elems) 方法的对应实现`);
  }

  failback(err, callback) {
    callback(err);
  }

  _write(elem, encoding, callback) {
    this.produce([elem])
      .then(() => callback(null))
      .catch((err) => this.failback(err, callback));
  }

  _writev(elems, callback) {
    this.produce(elems)
      .then(() => callback(null))
      .catch((err) => this.failback(err, callback));
  }

  // _final(callback) {
  //   this.done()
  //     .then(() => callback(null))
  //     .catch((err) => this.failback(err, callback));
  // }
}

Object.assign(Sink.prototype, require("./base"));
module.exports = Sink;