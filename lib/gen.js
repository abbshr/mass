const states = require("./states");
const fs = require("fs");
const path = require("path");

class Gen {
  constructor(StateClass, cfg) {
    this.StateClass = StateClass;
    this.cfg = cfg;
  }

  static get states() {
    return states.getall();
  }

  get states() {
    return states.getall();
  }

  setNextStateGenerator(stateGenerator) {
    this.stateGenerator = stateGenerator;
    return stateGenerator;
  }
  getNextStateGenerator() {
    return this.stateGenerator;
  }

  createStateStore() {
    return new this.StateClass(this.getNextStateGenerator(), this.cfg);
  }

  use(StateClass, cfg) {
    return this.setNextStateGenerator(new this.constructor(StateClass, cfg));
  }
}

// 加载 StateGenerator 类原型方法
fs.readdirSync(path.join(__dirname, "state-generators")).forEach(filename => {
  const stateGen = path.join(__dirname, "state-generators", filename);
  require(stateGen)(Gen);
  console.log("加载状态生成器:", stateGen);
});

module.exports = Gen;