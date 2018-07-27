module.exports = operators => {
  // 算子运算符基类
  // 继承自 Node Transform Stream
  class BlankCalculator extends operators.Calculator {
    // 所有 Calculator 都需要实现该方法
    async calc(elem) {
      this.product(elem);
    }

    async done() {
      console.log(this.constructor.name, "Calculator finished");
    }

    async fault(err) {
      console.log(err);
      throw err;
    }
  }

  operators.register("BlankCalculator", BlankCalculator);
};