const { Readable } = require("stream");

// 数据源运算符基类
// 继承自 Node Readable Stream
class Source extends Readable {
  constructor(env, opts) {
    super({ objectMode: true });

    // 引用运算符环境
    this.env = env;
    this.opts = opts;
  }

  // 将数据推入下一个运算符的消费队列 (当前运算符的内部缓冲区)
  product(d) {
    return this.push(d);
  }

  // 所有 Source 运算符都要实现该方法
  async consume(size) {
    throw new Error(`没有在类 [${this.constructor.name}] 中找到 consume(size) 方法的对应实现`);
    // pull message from kafka & push to buffer queue
    // this.kfkConsumer.consume(size, message => {
    //   this.product(message);
    // });
  }

  _read(size) {
    // this.consume(size).catch((err) => { throw err });
  }
}

module.exports = Source;