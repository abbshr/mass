module.exports = operators => {
  class TapCalculator extends operators.Calculator {
    constructor(env, probeFn) {
      super(env);
      this.probe = this.createSafeWrapper(probeFn);
    }
  
    async calc(elem) {
      await this.probe(elem);
      this.product(elem);
      this.showInternalDetails();
    }

    async cleanup() {
      console.log(this.constructor.name, "exit");
    }
  
    showInternalDetails() {
      console.log("Tap 内部堆积元素数量:", this.readableLength, "堆积阈值:", this.readableHighWaterMark);
    }
  
    createSafeWrapper(fn) {
      return async (data) => {
        try {
          await fn(data);
        } catch (err) {
          console.error("error in probe:", err);
        }
      }
    }
  }
  
  operators.register("TapCalculator", TapCalculator);
};