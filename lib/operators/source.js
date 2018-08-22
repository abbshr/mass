const { Readable } = require("stream");
const { MassElement } = require("../components/element");

// 数据源运算符基类
// 继承自 Node Readable Stream
class Source extends Readable {
  constructor(env) {
    super({ objectMode: true });

    // 引用运算符环境
    this.env = env;
    this._setupEventListeners();

    // this.maxRetryAttemps = 5;
  }

  _setupEventListeners() {
    this.once("end", () => this._onEnd());
    this.once("error", err => this._onError(err));
  }

  _onError(err) {
    // 解除与所有后继运算符的连接
    // console.log(this.constructor.name, "lastError:", this.lastError);
    this.unpipe();
    this._errorHandle(err);
  }
  _onEnd() {
    if (!this.destroyed) {
      this._doneHandle();
    }
  }

  // 将数据推入下一个运算符的消费队列 (当前运算符的内部缓冲区)
  // Using 'readable' requires calling .read().
  // The 'readable' is always emitted in the next tick after .push() is called
  // The 'readable' event will also be emitted once the end of the stream data has been reached but before the 'end' event is emitted.

  product(d) {
    return this.push(new MassElement(d));
  }

  // 停止
  terminate() {
    this.push(null);

    if (this._readableState.pipesCount === 0) {
      this.read();
    }
  }

  // redo() {
  //   if (this.readable) {

  //   }
  // }

  // 所有 Source 运算符都要实现该方法
  async consume(size) {
    throw new Error(`没有在类 [${this.constructor.name}] 中找到 consume(size) 方法的对应实现`);
  }

  _read(size) {
    this._attempRead(size);
  }

  async _attempRead(size) {
    try {
      await this.consume(size);
    } catch (err) {
      // retries++;
      try {
        // if (retries > this.maxRetryAttemps) {
        //   console.log(this.constructor.name, "源已超出最大重试次数");
        //   throw err;
        // }
        await this.failback(err, size);
      } catch (err) {
        this.purge(err);
      }
    }
    // this.consume(size)
    //   .catch(err => this.failback(err, () => this._attempRead(size)))
    //   .catch(err => this.purge(err));
  }

  async redo(size) {
    // consolse.log(this.constructor.name, "源由于错误", err, "尝试重试");

    // if (retries + 1 > this.maxRetryAttemps) {
    //   console.log(this.constructor.name, "源已超出最大重试次数");
    //   throw err;
    // } else {
    return this.consume(size);
    // }
  }
}

Object.assign(Source.prototype, require("./base"));
Object.assign(Source, require("./base-static"));
module.exports = Source;