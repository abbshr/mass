// .shard((elem) => elem.id)
// 类别: 分流器
// 根据 trait 函数返回值分流
module.exports = operators => {
  class ShardCalculator extends operators.Calculator {
    constructor(env, traitFn) {
      super(env);

      this.pipeTable = new Map();
      this.traitFn = traitFn;
      this.trapFnList = [() => {}];
    }

    async calc(elem) {
      const trait = this.traitFn(elem);

      // 动态建立 pipeline mesh
      if (!this.lookup(trait)) {
        const subpipe = this.createSubPipelineMesh(trait);
        this.register(trait, subpipe);
        // 连接 SelectCalculator
        this.env.pipe(subpipe);
      }

      elem.addShardingInfo(trait);
      await this.product(elem);
    }

    // 为每个 trait 生成独立的管道网副本
    // TODO: 动态生成的 pipeline 管理策略
    // 1. 定期释放 pipetable
    // 2. fixedsize 环形缓冲区
    createSubPipelineMesh(trait) {
      const selectOperator = operators.SelectCalculator.create(elem => this.traitFn(elem) === trait);
      const selectEnv = new this.env.superClass(this);
      selectEnv.fusion(selectOperator);

      // 动态生成子管道网
      for (let trapFn of this.trapFnList) {
        trapFn(selectEnv);
      }

      return selectEnv;
    }

    lookup(hash) {
      return this.pipeTable.has(hash);
    }

    register(hash, pipeline) {
      this.pipeTable.set(hash, pipeline);
    }

    /**
     * @summary pipeline 函数作用域之间最好不要共享对象, 存在修改同一个引用的隐患
     * @param {Function} fn 
     */
    pipeline(fn) {
      this.trapFnList.push(fn);
    }
  }

  // 注册操作符
  operators.register("ShardCalculator", ShardCalculator);
};