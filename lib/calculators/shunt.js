// .shunt((elem) => elem.id)
// 类别: 分流器
// 根据 trait 函数返回值分流
module.exports = operators => {
  class ShuntCalculator extends operators.Calculator {
    constructor(env, traitFn) {
      super(env);
  
      this.table = new Map();
      this.traitFn = traitFn;
    }
  
    async calc(input) {
      const trait = this.traitFn(input);
  
      // 动态建立 pipeline
      if (!this.lookup(trait)) {
        const pipeline = this.createSubPipeline(trait);
        this.pipe(pipeline);
      }
  
      this.product(input);
    }
  
    createSubPipeline(trait) {
      const filterOperator = new this.env.operators.FilterCalculator((input) => this.traitFn(input) === trait);
  
      for (const env of this.env.scope) {
        filterOperator.pipe(env.op);
      }
      return filterOperator;
    }
  
    lookup(hash) {
      return this.table.has(hash);
    }
  }

  // 注册操作符
  operators.register("ShuntCalculator", ShuntCalculator);
};