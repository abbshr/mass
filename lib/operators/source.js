const { Readable } = require("stream");
const { MassElement } = require("../components/element");
const applog = require("../applog");

// 数据源运算符基类
// 继承自 Node Readable Stream
class Source extends Readable {
  constructor(env) {
    super({ objectMode: true });
    this.setMaxListeners(0);

    // 引用运算符环境
    this.env = env;
    this._setupEventListeners();

    // 轮询重试次数
    this.pollRetries = 0;

    this.log = applog.child({ module: `[${this.constructor.name}]` });
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
    // TODO: 可能需要深拷贝 / immutable.js
    const clonedMassElement = MassElement.from(rawdata);
    try {
      await this.consume(clonedMassElement);
      this.resetPollRetries()
    } catch (err) {
      await this.recovery(err, { rawdata: clonedMassElement, retries: 0 });
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
        this.log.error(err, "源 %s 准备第 %s 次重试", this.constructor.name, this.pollRetries + 1);
        try {
          await this.redo()
        } catch (err) {
          await this.failback(err)
        }
      } else {
        this.log.error(err, "源 %s 已超出最大重试次数", this.constructor.name);
        this.handleMaxRetryAttempsExceed(err);
        this.resetPollRetries()
      }

    // consume 过程中的异常
    } else {
      wrapdata.retries = wrapdata.retries || 0;

      if (wrapdata.retries < this.maxRetryAttemps) {
        this.log.error(err, "源 %s 准备第 %s 次重试", this.constructor.name, wrapdata.retries + 1);
        try {
          await this.redo(wrapdata)
        } catch (err) {
          await this.failback(err, wrapdata)
        }
      } else {
        this.log.error(err, "源 %s 已超出最大重试次数, 相关数据: %o", this.constructor.name, wrapdata.rawdata);
        this.handleMaxRetryAttempsExceed(err);
      }
    }
  }

  // 将数据推入下一个运算符的消费队列 (当前运算符的内部缓冲区)
  // Using 'readable' requires calling .read().
  // The 'readable' is always emitted in the next tick after .push() is called
  // The 'readable' event will also be emitted once the end of the stream data has been reached but before the 'end' event is emitted.

  product(d) {
    if (!this.push(new MassElement(d))) {
      this.haltPoll()
    }
  }

  // 停止
  terminate() {
    this.push(null);

    if (this._readableState.pipesCount === 0) {
      this.read();
    }
  }

  async reconnect() {
    // throw new Error(`没有在类 [${this.constructor.name}] 中找到 reconnect() 方法的对应实现`);
  }

  // 所有 Source 运算符都要实现该方法
  async poll(size) {
    throw new Error(`没有在类 [${this.constructor.name}] 中找到 poll(size) 方法的对应实现`);
  }

  haltPoll() {
    throw new Error(`没有在类 [${this.constructor.name}] 中找到 haltPoll() 方法的对应实现`);
  }

  // 所有 Source 运算符都要实现该方法
  async consume(rawdata) {
    // await this.product({ record: data.rawdata })
    throw new Error(`没有在类 [${this.constructor.name}] 中找到 consume(rawdata) 方法的对应实现`);
  }

  async redo(...args) {
    // 重试 poll
    if (args.length === 0) {
      this.pollRetries++
      await this.reconnect();
      return this.poll();

    // 重试消费
    } else {
      const [wrapdata] = args
      wrapdata.retries++
      return this.consume(wrapdata.rawdata);
    }
  }
}

Object.assign(Source.prototype, require("./base"));
Object.assign(Source, require("./base-static"));
module.exports = Source;