// TODO: 虚拟 Env 及其实体生成, 以实现对每个 sub venv 的状态观察
module.exports = Env => {
  Env.prototype.shard = function (traitFn) {
    if (traitFn instanceof this.operators.ShardCalculator) {
      if (traitFn.env instanceof Env) {
        throw new Error(`ShardCalculator 不能被共享, 检查到已被 env: ${traitFn.env} 占用`)
      } else {
        return this.pipe((new Env(this)).fusion(traitFn))
      }
    } else {
      return this.pipe((new Env(this)).fusion(this.operators.ShardCalculator.create(traitFn)))
    }
  };
};