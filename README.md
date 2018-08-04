# Mass v2

# 背景

Mass v1 是在监控项目的需求下诞生的 Node.js **周期性任务调度框架**, 监控的数据处理逻辑也是基于 Mass v1 落实的. 由于早期的应用场景很局限, 设计/开发时间很短暂, 为了数据处理逻辑编写上的便捷, 已经将监控的数据模型写入了框架中, 因此说 Mass v1 是一个完全面向监控 Prism 的调度框架, 缺乏健壮和长远的思考与设计.

## 那么 Mass v1 及其生态存在哪些问题?

- 只有基于时间的调度 (`at`, `at_every`)
- 高度耦合了 Prism 的数据模型, 导致离开监控或监控升级几乎不可用
- 数据源和数据目的地的很难配置, 也很难修改
- 绑定了 Elasticsearch 作为数据源
- 绑定了 MySQL 作为数据目的地
- 只能进行批处理, 没有流处理能力
- 任务容错策略单一, 且不可自定义
- 没有数据处理上的概念和形式
- 涉及到数据处理时没有框架级的规范和确定的 API
- 任务难以测试
- 框架缺乏单测
- 难以在基础上构建分布式系统
- 没写充分的文档
- 配置自由没有约定, 一旦多起来很容易混乱
- …

## 但也有一些值得延续下来的设计和思路

- 将计算和 I/O 统一抽象为任务
- 所有任务由调度器角色统一管理
- 数据源, 数据目的地, 处理机这几个隐藏的概念
- ES 客户端上手动实现的初步的增量计算
- 任务调度语义 (如时间上的 at, at_every)
- 任务状态存储
- 隐式的窗口 watermark 方法
- …

## 设计原则

有了 Mass v1 的铺垫, 加之经历更多使用场景和需求之后, 根据遇到的问题和一些思考和总结, Mass v2 逐步成型.

Mass v2 的设计严格遵循 extendable, visible. 内部的任何组件都尽可能做到可扩展, 可独立运作. 组件的工作输入和产出结果尽可能可见, 异常信息尽可能详细有上下文.

Mass v2 在与 v1 在能力差别上, 主要表现在:

- 更完备健壮的任务与调度器
  - 任务具备状态
  - 调度器支持两种调度方式: 常规调度和抢占式调度.
  - 任务具备两种性质: 一次性执行和可重复执行.
  - 支持对任务添加调度修饰符, 包括但不限于: 定期/时间点调度, 信号调度.
  - 可取消调度器上尚未执行 (run) 的任务
  - 在任务之上实现了流处理能力与 API.
  - 任务支持可配置的重试策略
  - 超过重试限制或者根据重试策略推测无法继续的任务, 会加入到死信队列, 可以在某个时候再重新处理.
  - 多个任务支持以执行图 (execute graph) 执行, 可建立依赖关系.
  - 任务内的事务状态存储接口, 在任务成功后自动提交, 失败时回滚.
- 提供了流计算类型任务
  - 可扩展的支持链式调用的计算 API
  - 可扩展的运算符
  - 允许构建管道网 (pipeline mesh)
  - 具备管道的流控, 回压能力.
  - 支持增量计算
  - 支持对大多数运算符状态进行管理控制
  - 支持记录级容错策略配置
  - 支持任意源和目标的组合
  - 流计算过程中的资源管理能力
  - 支持运算符内计算中间态存储
  - 可与常规任务组合执行
  - 提供了方便调试工具
  - 预置了一些常用的关键运算符和增量计算中的状态聚合器 (窗口, 分组, 记录聚合, 过滤, 分片, 求和, 迭代 …)
- …

# 宏观架构

# 范例

# 框架和约定

# API

# 注意事项

- 

# 开发更多流处理运算符

# 微观体系

## 运算符分类

### 源

```js
// my.source.js
class MySource extends Mass.operators.Source {
  async consume(size) {

  }

  async done() {

  }

  async fatal(err) {

  }

  async cleanup(err) {

  }

  failback(err) {

  }
}

operators.register("MySource", MySource);
```

### 算子

```js
// my.calculator.js
class MyCalcualtor extends Mass.operators.Calculator {
  async calc(elem) {

  }

  async done() {

  }

  async fatal(err) {

  }

  async cleanup(err) {

  }

  failback(err, callback) {

  }
}

operators.register("MyCalculator", MyCalculator);
```

### 输出

```js
// my.sink.js
class MySink extends Mass.operators.Sink {
  async produce(elems) {

  }

  async done() {

  }

  async fatal(err) {

  }

  async cleanup(err) {

  }

  failback(err, callback) {

  }
}

operators.register("MySink", MySink);
```

## 环境对象

环境对象是所有 Mass 流运算符的基本运行环境, 维护了一个流运算符所使用的上下文信息.

环境对象由环境类 (Env) 及其子类实例化.

```js
class MySourceEnv extends Mass.Env {
  constructor(executor, ancestorEnv, probeFn) {
    super(executor, ancestorEnv, probeFn);
    this._op = new this.operators.MySource(this, probeFn);
  }
}
```

环境对象也是进入流处理任务模式的入口:

```js
scheduler.spawnTask(MassStreamTask, {
  async streamProcessExecutor(env, bus) {
    await env.from(new MySource()).to(new MySink());
  }
});
```

## 状态聚合器

```js
class MeansStateAggregator extends Mass.states.StateAggregator {
  constructor() {
    super();
    this._sum = 0;
    this._size = 0;
    this._result = NaN;
  }

  async collect(elem) {
    this._result = (this._sum += elem.record) / ++this._size;
  }

  async yield() {
    return this._result;
  }
}

```

## API 语法糖

```js
Env.prototype.means = function(term_condition) {
  return this.pipe(new Means(this, term_condition));
};
```

```js
StateGenerator.prototype.means = function() {
  
};
```