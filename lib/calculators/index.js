const operators = require("../operators");
// 算子运算符基类
// 继承自 Node Transform Stream
class BlankCalculator extends require("../operators/calculator") {
  // 所有 Calculator 都需要实现该方法
  async calc(elem) {
    
  }

  async done() {

  }
}

operators.register("BlankCalculator", BlankCalculator);
module.exports = BlankCalculator;