const { Transform } = require("stream");

class Calculator extends Transform {
  constructor(env, opts) {
    super({ readableObjectMode: true, writableObjectMode: true });

    // 流计算环境对象
    this.env = env;
    this.opts = opts;
  }

  // 所有 Calculator 都需要实现该方法
  async calc(elem) {
    throw new Error(`没有在类 [${this.constructor.name}] 中找到 calc(elem) 方法的对应实现`);
  }

  async done() {}

  product(d) {
    return this.push(d);
  }

  markTimestamp(elem) {
    elem.markTimestamp(this);
  }

  _transform(elem, encoding, callback) {
    this.calc(elem)
      .then(() => callback(null))
      .catch((err) => callback(err));
  }

  _flush(callback) {
    this.done()
      .then(() => callback(null))
      .catch((err) => callback(err));
  }
}
module.exports = Calculator;