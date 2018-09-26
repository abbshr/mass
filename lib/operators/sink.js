const { Writable } = require("stream");
const { MassElement } = require("../components/element");
const applog = require("../applog");

// 输出运算符基类
// 继承自 Node Writable Stream
class Sink extends Writable {
  constructor(env) {
    super({ objectMode: true });
    this.setMaxListeners(0);

    // 流计算环境对象
    this.env = env;

    // 记录前驱运算符数量
    this.prevCount = 0;

    this._setupEventListeners();

    this.log = applog.child({ module: `[${this.constructor.name}]` });
  }

  _setupEventListeners() {
    this.once("finish", () => this._onFinish());
    this.once("error", err => this._onError(err));

    this.on("pipe", () => this.prevCount++);
    this.on("unpipe", upstream => {
      this.prevCount--;

      // 当已经没有前驱时, 关闭运算符
      if (this.prevCount === 0) {
        if (upstream.lastError instanceof Error) {
          if (!this.destroyed) {
            this.purge(upstream.lastError);
          }
        } else {
          this.end();
        }
      }
    });
  }

  _onError(err) {
    // console.log(this.constructor.name, "lastError:", this.lastError);
    this._errorHandle(err);
  }
  _onFinish() {
    if (!this.destroyed) {
      this._doneHandle();
    }
  }

  _write(elem, encoding, callback) {
    if (elem.discard) {
      this.log.trace("%s discard elem: %o", this.constructor.name, elem);
      return this._attempCommitDirectly(elem, callback);
    }
    // TODO: 可能需要深拷贝 / immutable.js
    this._attempWrite(MassElement.from(elem), callback);
  }

  async _attempCommitDirectly(elem, callback) {
    try {
      await this.commit(elem);
    } catch (err) {
      this.log.error(err, "offset 提交失败. 数据类型: discard 数据: %o", elem);
    } finally {
      callback(null);
    }
  }

  async _attempWrite(elem, callback) {
    try {
      await this.produce(elem);
      await this.commit(elem);
      callback(null);
    } catch (err) {
      await this.recovery(err, elem, callback);
    }
  }

  async recovery(err, elem, callback) {
    if (this.destroyed) {
      return;
    }

    try {
      await this.failback(err, elem);
      await this.commit(elem);
      callback(null);
    } catch (err) {
      await this.rollback(elem);
      this.purge(err);
    }
  }

  async failback(err, elem) {
    this.encounterError(err, elem);

    if (elem.retries < this.maxRetryAttemps) {
      this.log.error(err, "汇 %s 准备第 %s 次重试", this.constructor.name, elem.retries + 1);
      try {
        await this.redo(elem)
      } catch (err) {
        await this.failback(err, elem)
      }
    } else {
      this.log.error(err, "汇 %s 已超出最大重试次数, 相关数据: %o", this.constructor.name, elem);
      this.handleMaxRetryAttempsExceed(err);
    }
  }

  // 所有 Sink 运算符都要实现该方法
  async produce(elem) {
    throw new Error(`没有在类 [${this.constructor.name}] 中找到 produce(elem) 方法的对应实现`);
  }

  terminate() {
    this.end();
  }

  clone() {
    return this.constructor.create();
  }

  /**
   * @desc 记录前进, 提交最大的 offset
   * @param {MassElement} elem
   */
  async commit(elem) {
    if (!this.offsetManager) {
      this.offsetManager = this.env && this.env.offsetManager;

      if (!this.offsetManager) {
        return this.log.warn("%s 未找到 offsetManager, 不会提交 offset, 相关元素: %o", this.constructor.name, elem);
      }
    }

    if (elem.offsets) {
      for (const [offsetKey, { maxOffset }] of elem.offsets) {
        this.offsetManager.update(offsetKey, this, maxOffset + 1);
      }
    } else if (elem.offset) {
      const offsetKey = `${elem.topic}:${elem.partition}`;
      this.offsetManager.update(offsetKey, this, elem.offset + 1);
    }
  }

  /**
   * @desc 记录回滚, 提交当前元素上最小的 offset - 1
   * @param {MassElement} elem 
   */
  async rollback(elem) {
    if (!this.offsetManager) {
      this.offsetManager = this.env && this.env.offsetManagers;

      if (!this.offsetManager) {
        return this.log.warn("%s 未找到 offsetManager, 不会提交 offset, 相关元素: %o", elem);
      }
    }

    if (elem.offsets) {
      for (const [offsetKey, { minOffset }] of elem.offsets) {
        this.offsetManager.update(offsetKey, this, minOffset - 1);
      }
    } else if (elem.offset) {
      const offsetKey = `${elem.topic}:${elem.partition}`;
      this.offsetManager.update(offsetKey, this, elem.offset - 1);
    }
  }

  async redo(elem) {
    elem.retries++;
    return this.produce(elem);
  }

  // _writev(elems, callback) {
  //   this.produce(elems.map(e => e.chunk))
  //   .then(
  //     () => callback(null),
  //     err => this.failback(err, elem).then(
  //       () => callback(null), err => this.purge(err)
  //     )
  //   );
  // }

  // _final(callback) {
  //   this.done()
  //     .then(() => callback(null))
  //     .catch((err) => this.failback(err, callback));
  // }
}

Object.assign(Sink.prototype, require("./base"));
Object.assign(Sink, require("./base-static"));
module.exports = Sink;