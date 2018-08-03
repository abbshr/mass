(async () => {
  const { Env, operators } = await require("..")({ task_store: { cfg: { schema: "client:" } } });
  try {
    const env = new Env(null);

    const src_1 = env.from(new operators.GeneratorSource(null, {
      emitter() { return Math.random() * 1000 >> 0; },
      frequency: 2000,
      limit: 5,
    }));

    const src_2 = env.from(new operators.GeneratorSource(null, {
      frequency: 1000,
      limit: 20,
    }));

    const calc = src_1.tap(elem => console.log("Tap", elem));

    src_2.pipe(calc);

    await Promise.all([
      calc.to(new operators.ValidateSink(null, elem => {
        console.log("CHECK_1:", elem);
        return elem.record > 600 || elem.record <= 1;
      })),
  
      calc.to(new operators.ValidateSink(null, elem => {
        console.log("CHECK_2:", elem);
        return elem.record < 1000;
      }))
    ]);

    console.log("R", "DONE");
  } catch (err) {
    console.log("E", err);
  }
})();
// const GeneratorSource = require("../lib/sources/generator");
// const BlankCalculator = require("../lib/calculators");
// const ValidateSink = require("../lib/sinks/validate");
// const pEvent = require("p-event");

// const src = new GeneratorSource(null, {
//   emitter() { return Math.random() * 1000 >> 0; },
//   frequency: 2000,
//   limit: 5,
// });

// const src_2 = new GeneratorSource(null, {
//   frequency: 1000,
//   limit: 20,
// });

// const cal = new BlankCalculator();
// const dest = new ValidateSink(null, elem => {
//   console.log("CHECK_1:", elem);
//   return elem.record > 200 || elem.record <= 1;
// });

// const dest_2 = new ValidateSink(null, elem => {
//   console.log("CHECK_2:", elem);
//   return elem.record < 1000;
// });

// Object.assign(global, {src, cal, dest});

//      dest_2
//         ^
//         |
// src -> cal -> dest
//         ^
//         |
//       src2
// src.pipe(cal, {end: false}).pipe(dest, {end: false});
// src_2.pipe(cal, {end: false}).pipe(dest_2, {end: false});

// pEvent(dest, "operator_done", { rejectionEvents: ["operator_error"] }).then(() => console.log("DONE")).catch(err => console.log("ERR", err));