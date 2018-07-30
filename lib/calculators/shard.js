// .shard((elem) => elem.id)
// 类别: 分流器
// 根据 trait 函数返回值分流
module.exports = operators => {
  class ShardCalculator extends operators.Calculator {
    constructor(env, traitFn) {
      super(env);

      this.pipeTable = new Map();
      this.traitFn = traitFn;
    }

    async calc(input) {
      const trait = this.traitFn(input);

      // 动态建立 pipeline mesh
      if (!this.lookup(trait)) {
        this.pipe(this.createSubPipelineMesh(trait));
      }

      this.product(input);
    }

    // 为每个 trait 生成独立的管道网副本
    createSubPipelineMesh(trait) {
      const filterOperator = new this.env.operators.FilterCalculator((input) => this.traitFn(input) === trait);

      for (const env of this.env.vitrualScope) {
        const envcopy = env.clone();
        this.env.scope.add(envcopy);
        filterOperator.pipe(envcopy.op);
      }
      return filterOperator;
    }

    lookup(hash) {
      return this.pipeTable.has(hash);
    }
  }

  // 注册操作符
  operators.register("ShardCalculator", ShardCalculator);
};