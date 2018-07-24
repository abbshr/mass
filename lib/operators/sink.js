const { Writable } = require("stream");

// 输出运算符基类
// 继承自 Node Writable Stream
class Sink extends Writable {
  constructor(env, opts) {
    super({ objectMode: true });

    this.env = env;
    this.opts = opts;

    this.on("error", err => this.fault(err));
  }

  // 所有 Sink 运算符都要实现该方法
  async produce(elems) {
    throw new Error(`没有在类 [${this.constructor.name}] 中找到 produce(elems) 方法的对应实现`);
    // push data as a message to kfk
    // push all buffered data as messages to kfk in one operation
    // this.kfkProducer.produce(elems.map(c => c.chunk), (err, receipt) => {
    //   callback(err);
    // })
  }

  // Sink 运算符可以选择实现该方法 (参考 Writable.prototype._final)
  async done() {}

  async fault(err) {
    throw err;
  }

  _write(elem, encoding, callback) {
    this.produce([elem])
      .then(() => callback(null))
      .catch((err) => callback(err));
  }

  _writev(elems, callback) {
    this.produce(elems)
      .then(() => callback(null))
      .catch((err) => callback(err));
  }

  _final(callback) {
    this.done()
      .then(() => callback(null))
      .catch((err) => callback(err));
  }
}

module.exports = Sink;