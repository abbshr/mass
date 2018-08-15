// operator 通用基础方法
module.exports = {
  // 运算符正常结束
  async done() {},
  // 运算符异常退出
  async fatal(err) {},

  // 收尾清理
  async cleanup() {},

  // 记录级容错处理
  async failback(err) {
    // 无法恢复的错误处理
    throw err;
  },

  // onerror
  _errorHandle(err) {
    this.fatal(err).finally(() => {
      this.emit("operator_error", err);
      return this.cleanup();
    }).finally(() => {
      this.emit("operator_close", err);
    });
  },

  // onend | onfinish
  _doneHandle() {
    this.done().finally(() => {
      this.emit("operator_done", this);
      return this.cleanup();
    }).finally(() => {
      this.emit("operator_close", null);
    });
  },

  markTimestamp(elem) {
    elem.markTimestamp(this);
  },
};