const getApplog = require("./applog");

class EnvResourceManager {
  constructor(env) {
    this.log = getApplog().child({ module: `[${this.constructor.name}]` });
    this.rootEnv = env;
    this.Sink = env.operators.Sink;
    // this.resourceList = [];
    // this.resourceTable = new Map();
  }

  async waitExtremityEnvsRelease() {
    // 遍历所有末端运算符, 得到结束状态.
    for (let env of this.getPendExtremityEnvs()) {
      try {
        await env;
      } catch (err) {
        // 如果是最后一个运算符, 则抛出错误
        if (this.getPendExtremityEnvs().size === 0) {
          // 释放所有尚未处理的资源
          this.free(this.rootEnv);
          throw err;
        }
      }
    }
  }

  // 从根节点向下 BFS 遍历
  // 防止释放后继节点后仍存在未关闭的前驱节点导致写入异常
  // 释放 rootEnv 持有的所有资源
  free(env) {
    for (let subenv of env.scope) {
      if (subenv._op) {
        subenv._op.terminate();
      }
    }

    for (let subenv of env.scope) {
      this.free(subenv);
    }
  }

  // TODO: 优化性能
  getPendExtremityEnvs() {
    return new Set(this.travel(this.rootEnv));
  }

  travel(env) {
    if (env.scope.size === 0) {
      if (env._op instanceof this.Sink) {
        return this.isTerminated(env) ? [] : [env];
      } else {
        return [];
      }
    }

    const nestedEnvs = Array.from(env.scope)
      .map(env => this.travel(env));

    return [].concat(...nestedEnvs);
  }

  isTerminated(env) {
    return env.exited;
  }
}

module.exports = EnvResourceManager;