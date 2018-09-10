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

    // 轮询重试次数
    this.pollRetries = 0;
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

  _read(size) {
    this._attempRead(size);
  }

  async _attempRead(size) {
    try {
      await this.poll(size);
      this.resetPollRetries()
    } catch (err) {
      await this.recovery(err);
    }
  }

  async crunch(rawdata) {
    const wrapdata = { rawdata, retries: 0 };

    try {
      await this.consume(wrapdata);
      this.resetPollRetries()
    } catch (err) {
      await this.recovery(err, wrapdata);
    }
  }

  async recovery(err, ...args) {
    if (this.destroyed) {
      return;
    }

    try {
      await this.failback(err, ...args);
    } catch (err) {
      this.purge(err);
    }
  }

  resetPollRetries() {
    this.pollRetries = 0
  }

  async failback(err, ...args) {
    const [wrapdata] = args;
    this.encounterError(err, wrapdata);

    // poll 过程中的异常
    if (args.length === 0) {
      if (this.pollRetries < this.maxRetryAttemps) {
        console.log(this.constructor.name, `源准备第 ${this.pollRetries + 1} 次重试,`, "Error:", err)
        await this.redo()
      } else {
        console.log(this.constructor.name, "源已超出最大重试次数", "Error:", err)
        this.handleMaxRetryAttempsExceed(err);
      }

    // consume 过程中的异常
    } else {
      wrapdata.retries = wrapdata.retries || 0;

      if (wrapdata.retries < this.maxRetryAttemps) {
        console.log(this.constructor.name, `源准备第 ${this.retries + 1} 次重试,`, "Error:", err)
        await this.redo(wrapdata)
      } else {
        console.log(this.constructor.name, "源已超出最大重试次数", "Error:", err)
        this.handleMaxRetryAttempsExceed(err);
      }
    }
  }

  // 将数据推入下一个运算符的消费队列 (当前运算符的内部缓冲区)
  // Using 'readable' requires calling .read().
  // The 'readable' is always emitted in the next tick after .push() is called
  // The 'readable' event will also be emitted once the end of the stream data has been reached but before the 'end' event is emitted.

  async product(d) {
    return this.push(new MassElement(d));
  }

  // 停止
  terminate() {
    this.push(null);

    if (this._readableState.pipesCount === 0) {
      this.read();
    }
  }

  // 所有 Source 运算符都要实现该方法
  async poll(size) {
    throw new Error(`没有在类 [${this.constructor.name}] 中找到 poll(size) 方法的对应实现`);
  }

  // 所有 Source 运算符都要实现该方法
  async consume(wrapdata) {
    // await this.product({ record: data.rawdata })
    throw new Error(`没有在类 [${this.constructor.name}] 中找到 consume(wrapdata) 方法的对应实现`);
  }

  async redo(...args) {
    // 重试 poll
    if (args.length === 0) {
      this.retries++
      return this.poll();

    // 重试消费
    } else {
      const [wrapdata] = args
      wrapdata.retries++
      return this.consume(wrapdata);
    }
  }
}

Object.assign(Source.prototype, require("./base"));
Object.assign(Source, require("./base-static"));
module.exports = Source;