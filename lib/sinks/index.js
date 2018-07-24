const operators = require("../operators");
// 输出运算符基类
// 继承自 Node Writable Stream
class BlankSink extends require("../operators/sink") {
  // 所有 Sink 运算符都要实现该方法
  async produce(elems) {

  }

  // Sink 运算符可以选择实现该方法 (参考 Writable.prototype._final)
  async done() {

  }

  async fault(err) {
    console.log(err);
    throw err;
  }
}

operators.register("BlankSink", BlankSink);
module.exports = BlankSink;