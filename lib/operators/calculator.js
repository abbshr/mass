const Gen = require("../gen");
const states = require("../states");
const { Transform } = require("stream");
const { MassElement } = require("../components/element");
const applog = require("../applog");
const syslog = require("../syslog");

const fs = require("fs");
const path = require("path");

class Calculator extends Transform {
  constructor(env) {
    super({ readableObjectMode: true, writableObjectMode: true });
    this.setMaxListeners(0);

    // 流计算环境对象
    this.env = env;

    // 记录前驱运算符数量
    this.prevCount = 0;

    this._setupEventListeners();

    this.log = applog.child({ module: `[${this.constructor.name}]` });
  }

  _setupEventListeners() {
    this.once("end", () => this._onEnd());
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

  _transform(elem, encoding, callback) {
    if (elem.discard) {
      this.discard(elem);
      return callback(null);
    }
    // TODO: 可能需要深拷贝 / immutable.js
    this._attempTransform(MassElement.from(elem), callback);
  }

  async _attempTransform(elem, callback) {
    try {
      await this.calc(elem);
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
      callback(null);
    } catch (err) {
      this.purge(err);
    }
  }

  async failback(err, elem) {
    this.encounterError(err, elem);

    if (elem.retries < this.maxRetryAttemps) {
      this.log.error(err, "算子 %s 准备第 %s 次重试", this.constructor.name, elem.retries + 1);
      try {
        await this.redo(elem)
      } catch (err) {
        await this.failback(err, elem)
      }
    } else {
      this.log.error(err, "算子 %s 已超出最大重试次数, 相关数据: %o", this.constructor.name, elem);
      this.handleMaxRetryAttempsExceed(err, elem);
    }
  }

  async reducer(d) {
    return d;
  }

  // 所有 Calculator 都需要实现该方法
  async calc(elem) {
    throw new Error(`没有在类 [${this.constructor.name}] 中找到 calc(elem) 方法的对应实现`);
  }

  // 停止
  terminate() {
    this.end();

    if (this._readableState.pipesCount === 0) {
      this.read();
    }
  }

  clone() {
    return this.constructor.create();
  }

  setStateGenerator(gen) {
    return this.stateGenerator = gen;
  }

  get gen() {
    return this.lastStateGenerator;
  }

  get states() {
    return states.getall();
  }

  use(StateClass, ...cfg) {
    if (this.lastStateGenerator instanceof Gen) {
      this.lastStateGenerator = this.lastStateGenerator.use(StateClass, ...cfg);
    } else if (StateClass instanceof Gen) {
      this.lastStateGenerator = this.setStateGenerator(gen);
    } else {
      this.lastStateGenerator = this.setStateGenerator(new Gen(StateClass, ...cfg));
    }

    return this;
  }

  reduce(fn) {
    if (typeof fn !== "function") {
      throw new Error();
    }

    this.reducer = fn;

    return this;
  }

  async product(d) {
    // 输出前调用聚合函数
    const reducedResult = await this.reducer(d);

    // 对于可迭代结果集
    if (reducedResult[Symbol.iterator]) {
      for (let result of reducedResult) {
        this.push(new MassElement(result))
      }
    } else {
      this.push(new MassElement(reducedResult))
    }
  }

  async discard(d) {
    this.log.trace("%s discard elem: %o", this.constructor.name, d);
    this.push(new MassElement({ ...d, discard: true }));
  }

  // 创建新的中间计算状态存储区
  // 保存计算中间状态
  createStateStore() {
    if (this.stateGenerator) {
      return this.stateGenerator.createStateStore();
    } else {
      return new states.State();
    }
  }

  async redo(elem) {
    elem.retries++;
    return this.calc(elem);
  }

  // _flush(callback) {
  //   this.done()
  //     .then(() => callback(null))
  //     .catch((err) => this.failback(err, callback));
  // }
}

Object.assign(Calculator.prototype, require("./base"));
Object.assign(Calculator, require("./base-static"));

// 加载 StateGenerator 语法糖
fs.readdirSync(path.join(__dirname, "../state-generators")).forEach(filename => {
  const stateGen = path.join(__dirname, "../state-generators", filename);
  require(stateGen)(Gen, Calculator);
  syslog.info("加载状态生成器:", stateGen);
});

module.exports = Calculator;