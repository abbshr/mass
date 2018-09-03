module.exports = (Gen, Calculator) => {
  Gen.prototype.record = function (template, initial) {
    return this.use(this.states.RecordStateAggregator, template, initial)
  };

  Calculator.prototype.record = function (template, initial) {
    this.use(this.states.RecordStateAggregator, template, initial)

    return this
  };
}