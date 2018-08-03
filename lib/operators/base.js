const { MassElement } = require("../components/element");

// operator 通用基础方法
module.exports = {
  product(d) {
    return this.push(new MassElement(d));
  },

  // Sink 运算符可以选择实现该方法 (参考 Writable.prototype._final)
  async done() {},
  async fatal(err) {},
  async cleanup() {},

  _errorHandle(err) {
    this.fatal(err).finally(() => {
      this.emit("operator_error", err);
      return this.cleanup();
    }).finally(() => {
      this.emit("operator_close", err);
    });
  },

  _doneHandle() {
    this.done().finally(() => {
      this.emit("operator_done", this);
      return this.cleanup();
    }).finally(() => {
      this.emit("operator_close", null);
    });
  },

  // 无法恢复的错误处理
  fault(err) {
    this.emit("error", err);
  },

  markTimestamp(elem) {
    elem.markTimestamp(this);
  },
};