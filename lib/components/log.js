const pino = require("pino");

// class Log {
//   constructor(cfg) {
//     this.cfg = cfg;
//     this.update();
//   }

//   get log() {
//     return this.logger;
//   }

//   trace(...args) { return this.logger.trace(...args); }
//   debug(...args) { return this.logger.debug(...args); }
//   info(...args) { return this.logger.info(...args); }
//   warn(...args) { return this.logger.warn(...args); }
//   error(...args) { return this.logger.error(...args); }
//   fatal(...args) { return this.logger.fatal(...args); }

//   child(bindings) {
//     return this.logger.child(bindings);
//     // return {
//     //   trace: (...args) => this.logger.trace(...args, bindings),
//     //   debug: (...args) => this.logger.debug(...args, bindings),
//     //   info: (...args) => this.logger.info(...args, bindings),
//     //   warn: (...args) => this.logger.warn(...args, bindings),
//     //   error: (...args) => this.logger.error(...args, bindings),
//     //   fatal: (...args) => this.logger.fatal(...args, bindings),

//     //   child: childBindings => this.child({ ...bindings, ...childBindings }),
//     // }

//   }

  // createLog() {
  //   const dest = pino.destination(this.cfg.target || 1);
  //   const options = {
  //     name: "mass-v2",
  //     level: "trace",
  //     ...this.cfg.options,
  //   };

  //   this.logger = pino(options, dest);
  // }
// }

// module.exports = Log;
module.exports = logcfg => {
  const dest = pino.destination(logcfg.target || 1);
  const options = {
    name: "mass-v2",
    level: "trace",
    ...logcfg,
  };

  return pino(options, dest);
};