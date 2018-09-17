// operator 通用基础方法
module.exports = {
  // 运算符最大重试次数
  maxRetryAttemps: 5,

  // 失败处理模式
  fault: {
    mode: {
      IGNORE: "ignore",
      THROWN: "thrown",
    },
  },

  // 错误类型
  error: {
    type: {
      noretry: "noretry",
      retriable: "retriable",
      ignorable: "ignorable",
      throwable: "throwable",
    },
  },

  noretry(err) {
    err.type = this.error.type.noretry
    throw err
  },

  retriable(err) {
    err.type = this.error.type.retriable
    throw err
  },

  ignorable(err) {
    err.type = this.error.type.ignorable
    throw err
  },

  throwable(err) {
    err.type = this.error.type.throwable
    throw err
  },

  // 运算符正常结束
  async done() {},
  // 运算符异常退出
  async fatal(err) {},

  // 收尾清理
  async cleanup() {},

  // 跳过处理失败
  async skip(err, elem) {
    this.log.error(err, "运算符 %s 跳过错误, 相关数据: %o", this.constructor.name, elem || null);
  },

  // 给运算符设置失败处理模式
  set fault_mode(mode) {
    this._onMaxRetryAttempsExceed = mode
  },

  // 销毁运算符
  purge(err) {
    if (!this.lastError) {
      this.lastError = err;
    }

    this.destroy(err);
  },

  // onerror
  _errorHandle(err) {
    this.fatal(err)
    .finally(() => {
      this.emit("operator_error", err);
      return this.cleanup();
    })
    .finally(() => {
      this.emit("operator_close", err);
    });
  },

  // onend | onfinish
  _doneHandle() {
    this.done()
    .finally(() => {
      this.emit("operator_done", this);
      return this.cleanup();
    })
    .finally(() => {
      this.emit("operator_close", null);
    });
  },

  // 处理遇到错误
  encounterError(err, elem) {
    switch (err.type) {
      case this.error.type.ignorable:
        this.skipError(err, elem);
        return;
      case this.error.type.throwable:
        throw err;
      case this.error.type.noretry:
        return this.handleMaxRetryAttempsExceed(err, elem);
      default:
        break;
    }
  },

  // 处理超过最大重试次数
  handleMaxRetryAttempsExceed(err, elem) {
    const onMaxRetryAttempsExceed =
      this._onMaxRetryAttempsExceed || this.constructor._onMaxRetryAttempsExceed

    switch (onMaxRetryAttempsExceed) {
      case this.fault.mode.THROWN:
        throw err;
      case this.fault.mode.IGNORE:
      default:
        this.skipError(err, elem);
    }
  },

  // 跳过错误
  skipError(err, elem) {
    try {
      this.skip(err, elem);
    } catch (err) {
      this.log.error(err, "Error in Hook onSkipError");
    } finally {
      return;
    }
  },
};