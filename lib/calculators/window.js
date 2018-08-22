module.exports = operators => {
  class WindowCalculator extends operators.Calculator {
    // abstract interface
  }

  operators.register("WindowCalculator", WindowCalculator);
};