module.exports = (Gen, Calculator) => {
  Gen.prototype.groupBy = function (...assigners) {
    return this.use(this.states.GroupByStateAggregator, ...assigners)
  };

  Calculator.prototype.groupBy = function (...assigners) {
    this.use(this.states.GroupByStateAggregator, ...assigners)

    return this
  };
}