module.exports = {
  create(...cfg) {
    return new this(null, ...cfg);
  },

  set fault_mode(mode) {
    this._onMaxRetryAttempsExceed = mode;
  },
};