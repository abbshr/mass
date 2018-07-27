// operator 通用基础方法
module.exports = {
  product(d) {
    // TODO: MassElement
    return this.push(d);
  },

  // 停止
  terminate() {
    return this.push(null);
  },

  // Sink 运算符可以选择实现该方法 (参考 Writable.prototype._final)
  async done() {},
  async fatal(err) {},

  // 无法恢复的错误处理
  fault(err) {
    this.emit("error", err);
  },

  markTimestamp(elem) {
    elem.markTimestamp(this);
  },
};