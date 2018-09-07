module.exports = operators => {
  class TapCalculator extends operators.Calculator {
    constructor(env, probeFn) {
      super(env);
      this.probe = this.createSafeWrapper(probeFn);
    }

    async calc(elem) {
      await this.probe(elem);
    }

    showInternalDetails() {
      console.log("检测到元素进入", this.constructor.name, "内部堆积元素数量:", this.readableLength, "堆积阈值:", this.readableHighWaterMark);
    }

    /**
     * 不支持循环引用
     * @param {MassElement} elem 
     * @returns {MassElement}
     * @throws {TypeError} message: Converting circular structure to JSON
     */
    simpleDeepClone(elem) {
      return new elem.constructor(JSON.parse(JSON.stringify(elem)))
    }

    /**
     * @desc 一个调试用的代码安全的包装器, 只提供 exception 安全. 但对下列情况不做保障:
     * - OOM 无解
     * - 代码引发的进程异常无解
     * - process.exit() 无解
     * 
     * 性能考虑, 不建议在生产环境使用.
     * @param {AsyncFunction} fn 
     */
    createSafeWrapper(fn) {
      return async data => {
        this.showInternalDetails();

        try {
          await fn(this.simpleDeepClone(data));
        } catch (err) {
          console.error(this.constructor.name, ":", err);
        } finally {
          await this.product(data);
        }
      }
    }
  }

  operators.register("TapCalculator", TapCalculator);
};