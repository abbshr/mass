module.exports = (states) => {
  class StateGenerator {
    constructor(StateClass, cfg) {
      this.StateClass = StateClass;
      this.cfg = cfg;
    }

    static get states() {
      return states;
    }

    get states() {
      return states;
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

    addState(StateClass, cfg) {
      this.setNextStateGenerator(new this.constructor(StateClass, cfg));
    }
  }

  // 加载 StateGenerator 类原型方法
  fs.readdirSync(path.join(__dirname, "../state-generators")).forEach(filename => {
    const stateGen = path.join(__dirname, "../state-generators", filename);
    require(stateGen)(StateGenerator);
    console.log("加载状态生成器:", stateGen);
  });

  return StateGenerator;
};