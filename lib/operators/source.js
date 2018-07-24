const { Readable } = require("stream");

// 数据源运算符基类
// 继承自 Node Readable Stream
class Source extends Readable {
  constructor(env, opts) {
    super({ objectMode: true });

    // 引用运算符环境
    this.env = env;
    this.opts = opts;

    this.on("end", () => this.done());
    this.on("error", err => this.fault(err));
  }

  // 将数据推入下一个运算符的消费队列 (当前运算符的内部缓冲区)
  // Using 'readable' requires calling .read().
  // The 'readable' is always emitted in the next tick after .push() is called
  // The 'readable' event will also be emitted once the end of the stream data has been reached but before the 'end' event is emitted.
  product(d) {
    return this.push(d);
  }

  terminate() {
    return this.push(null);
  }

  // async onDone() {
  //   return pEvent(this, "end");
  // }

  async done() {}

  async fault(err) {
    throw err;
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
    this.consume(size).catch(err => this.emit("error", err));
  }
}

module.exports = Source;