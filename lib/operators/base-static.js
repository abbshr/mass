module.exports = {
  create(...cfg) {
    return new this(null, ...cfg);
  }
};