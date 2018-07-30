const { Readable } = require("stream");

// 数据源运算符基类
// 继承自 Node Readable Stream
class Source extends Readable {
  constructor(env) {
    super({ objectMode: true });

    // 引用运算符环境
    this.env = env;
    this._setupEventListeners();
  }

  _setupEventListeners() {
    this.once("end", () => this._onEnd());
    this.once("error", err => this._onError(err));
  }

  _onError(err) {
    // 解除与所有后继运算符的连接
    this.unpipe();
    this._errorHandle(err);
  }
  _onEnd() {
    this._doneHandle();
  }

  // 将数据推入下一个运算符的消费队列 (当前运算符的内部缓冲区)
  // Using 'readable' requires calling .read().
  // The 'readable' is always emitted in the next tick after .push() is called
  // The 'readable' event will also be emitted once the end of the stream data has been reached but before the 'end' event is emitted.

  // 记录级容错处理
  failback(err) {
    this.fault(err);
  }

  // 停止
  terminate() {
    this.push(null);
    this.emit("end");
  }

  // 所有 Source 运算符都要实现该方法
  async consume(size) {
    throw new Error(`没有在类 [${this.constructor.name}] 中找到 consume(size) 方法的对应实现`);
  }

  _read(size) {
    this.consume(size).catch(err => this.failback(err));
  }
}

Object.assign(Source.prototype, require("./base"));
Object.assign(Source, require("./base-static"));
module.exports = Source;