const { Writable } = require("stream");
const { MassElement } = require("../components/element");

// 输出运算符基类
// 继承自 Node Writable Stream
class Sink extends Writable {
  constructor(env) {
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
    console.log(this.constructor.name, "lastError:", this.lastError);
    this._errorHandle(err);
  }
  _onFinish() {
    if (!this.destroyed) {
      this._doneHandle();
    }
  }

  // 所有 Sink 运算符都要实现该方法
  async produce(elems) {
    throw new Error(`没有在类 [${this.constructor.name}] 中找到 produce(elems) 方法的对应实现`);
  }

  terminate() {
    this.end();
  }

  product(d) {
    return this.push(new MassElement(d));
  }

  _write(elem, encoding, callback) {
    this.produce([elem])
    .then(
      () => callback(null),
      err => this.failback(err).then(
        () => callback(null), err => this.purge(err)
      )
    );
  }

  _writev(elems, callback) {
    this.produce(elems.map(e => e.chunk))
    .then(
      () => callback(null),
      err => this.failback(err).then(
        () => callback(null), err => this.purge(err)
      )
    );
  }

  // _final(callback) {
  //   this.done()
  //     .then(() => callback(null))
  //     .catch((err) => this.failback(err, callback));
  // }
}

Object.assign(Sink.prototype, require("./base"));
Object.assign(Sink, require("./base-static"));
module.exports = Sink;