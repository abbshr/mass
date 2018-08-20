const Gen = require("../gen");
const states = require("../states");
const { Transform } = require("stream");
const { MassElement } = require("../components/element");

const fs = require("fs");
const path = require("path");

class Calculator extends Transform {
  constructor(env) {
    super({ readableObjectMode: true, writableObjectMode: true });

    // 流计算环境对象
    this.env = env;

    // 记录前驱运算符数量
    this.prevCount = 0;

    this._setupEventListeners();
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

  redo(err, elem) {
    elem.retries++;
    console.log(this.constructor.name, "元素", elem, "由于错误", err, "尝试重试");

    if (elem.retries > elem.maxRetryAttemps) {
      console.log(this.constructor.name, "元素", elem, "已超出最大重试次数, 放弃重试");
      return false;
    }

    if (this.writable) {
      this.write(elem);
      console.log(this.constructor.name, "元素", elem, "由于错误", err, "重新加入输入队列队尾");
      return true;
    }
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

  use(StateClass, cfg) {
    if (this.lastStateGenerator instanceof Gen) {
      this.lastStateGenerator = this.lastStateGenerator.use(StateClass, cfg);
    } else if (StateClass instanceof Gen) {
      this.lastStateGenerator = this.setStateGenerator(gen);
    } else {
      this.lastStateGenerator = this.setStateGenerator(new Gen(StateClass, cfg));
    }

    return this;
  }

  reduce(fn) {
    this.reducer = fn;

    return this;
  }

  reducer(d) {
    return d;
  }

  product(d) {
    // 输出前调用聚合函数
    return this.push(new MassElement(this.reducer(d)));
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

  _transform(elem, encoding, callback) {
    this.calc(elem)
    .then(
      () => callback(null),
      err => this.failback(err, elem).then(
        () => callback(null), err => this.purge(err)
      )
    );
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
  console.log("加载状态生成器:", stateGen);
});

module.exports = Calculator;