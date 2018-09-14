const states = require("./states");
const getApplog = require("./applog");

class Gen {
  constructor(StateClass, ...cfg) {
    this.log = getApplog().child({ module: `[${this.constructor.name}]` });

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
    return new this.StateClass(this.getNextStateGenerator(), ...this.cfg);
  }

  use(StateClass, ...cfg) {
    return this.setNextStateGenerator(new this.constructor(StateClass, ...cfg));
  }
}

module.exports = Gen;