const operators = require("../operators");
// 数据源运算符基类
// 继承自 Node Readable Stream
class BlankSource extends require("../operators/source") {
  // 所有 Source 运算符都要实现该方法
  async consume(size) {

  }
}

operators.register("BlankSource", BlankSource);
module.exports = BlankSource;