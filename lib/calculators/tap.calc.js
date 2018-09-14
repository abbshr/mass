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
      this.log.debug("检测到元素进入 %s. 算子内部堆积元素数量: %s, (堆积阈值: %s)", this.constructor.name, this.readableLength, this.readableHighWaterMark);
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
      return async elem => {
        this.showInternalDetails();

        try {
          await fn(this.simpleDeepClone(elem));
        } catch (err) {
          this.log.error(err, "检查到源 %s  wrapper 内部发生错误", this.constructor.name);
        } finally {
          await this.product(elem);
        }
      }
    }
  }

  operators.register("TapCalculator", TapCalculator);
};