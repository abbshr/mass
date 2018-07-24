const GeneratorSource = require("../lib/sources/generator");
const BlankCalculator = require("../lib/calculators");
const CheckSink = require("../lib/sinks/check");

const src = new GeneratorSource(null, {
  emitter() { return Math.random() * 1000 >> 0; },
  frequency: 2000,
  limit: 5,
});

const cal = new BlankCalculator();
const dest = new CheckSink(null, elem => {
  console.log("CHECK:", elem);
  return elem.record > 1000;
});

src.pipe(cal).pipe(dest);