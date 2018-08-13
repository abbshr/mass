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

```js
const Mass = require("@wac/mass");

class MyScheduler extends Mass.MassTaskScheduler {

}

const scheduler = new MyScheduler(scheduler_cfg);

class MyTask extends Mass.MassTask {
  async executor(input, proceed, bus) {
    const email = await createEmailContent();
    const config = getEmailConfig();
    await mailSender(email, config);
  }
}

scheduler.spawnTask(MyTask, {
  taskId: 0x00,
  taskName: "mail-sender",
  taskDescription: "a task run at every 9:00 am",
})
.at_every("0 9 * * *");

class MyCalculator extends Mass.stream.operators.Calculator {
  
}

class MyEnv extends Mass.stream.Env {

}

class MyStateAggregator extends Mass.stream.states.StateAggregator {

}

class MyGen extends Mass.stream.Gen {

}

class MyStreamTask extends Mass.MassStreamTask {
  async streamProcessExecutor(env, bus) {
    await env.from()
      .mutate()
      .filter()
      .record()
      .to();

    const windowedStream = env.from().window().agg();
    windowedStream
      .use(env.states.GroupByStateAggregator, elem => elem.name)
      .sum();

    await windowedStream.to();
  }
}

scheduler.spawnTask(MyStreamTask, {
  taskId: 0x01,
})
.sched();

await scheduler.bootstrap();
```

# 框架和约定

框架提供两种编码习惯的选择.

对于习惯 **配置化** 编码的开发者, 可以选择开箱即用模式, 因为框架里已经预置了所有 **可用的** 组件:

```js
const scheduler = new Mass.MassTaskScheduler(scheduler_cfg);
scheduler.spawnTask(Mass.MassTask, {
  async executor(input, proceed, bus) {}
}).sched();

scheduler.spawnTask(Mass.MassStreamTask, {
  async streamProcessExecutor(env, bus) {}
}).sched();
```

而对于那些习惯使用面向对象模式的开发者, 或者需要对预置策略进行一些自定义调整的使用者来说, 继承和重载的思路可能更适合一些:

```js
class MyScheduler extends Mass.MassTaskScheduler {
  async failback() {
    
  }
}

class MyTask extends Mass.MassTask {
  async executor(input, proceed, bus) {

  }
}

class MyStreamTask extends Mass.MassStreamTask {
  async streamProcessExecutor(env, bus) {

  }
}

const scheduler = new MyScheduler(scheduler_cfg);
scheduler.spawnTask(MyTask, {}).sched();
scheduler.spawnTask(MyStreamTask, {}).sched();
```

> 建议使用第二种编码方式. 一个原因是这种书写方式代码结构清晰, 可读性高, 较容易维护.
> 另外可以非常容易的修改或增加原有组件的行为, 而扩展开发新组件的成本也会变得很低廉.

## 项目目录结构

基于 Mass v2 的项目可以以如下目录结构组织代码.

```
- schedulers/ # 存放自定义的调度器类
- tasks/ # 存放自定义的任务类
- operators/ # 存放自定义的操作符类
  - sources/
  - calculators/
  - sinks/
- states/ # 存放自定义的状态聚合器类
  - states/
  - aggregators/
- envs/ # 存放自定义的环境类
- gens/ # 存放自定义的状态生成器类
- components/ # 存放通用的组件内逻辑和数据结构
- scaffold.js # 配置和组装代码
- bootstrap.js # 入口
```

# API

## Scheduler API
## Task API
### TaskStore API
## Stream API
### Source API
### Sink API
### Calculator API
### State/StateAggregator API
### Env 管道 API
### Gen 管道 API

# 注意事项

## 管道回压的副作用

考虑一个管道网中的两种连接情况:

```js
const src_1 = Mass.stream.operators.MySQLSource.create();
const src_2 = Mass.stream.operators.KafkaSource.create();
const dest_1 = Mass.stream.operators.KafkaSink.create();
const dest_2 = Mass.stream.operators.ElasticsearchSink.create();

const calc = Mass.operators.Calculator.create();

env.from(src_1).compute(calc).to(dest_1);
env.from(src_2).compute(calc).to(dest_2);
```

Calc 计算来自两个数据源数据, 并同步到另外两个数据存储. 下图描述了这四个管道:

```
(src_1) --->        ---> (dest_1)
             \    /
             (calc)
             /    \
(src_2) --->        ---> (dest_2)
```

假设 dest_1 的消费速度远远强于 dest_2.

那么当 dest_2 发生阻塞时会发生什么?

首先 dest_2 会触发回压要求 calc 降低生产速率, 紧接着 由于 calc 生产速率的下降, dest_1 得不到充分的利用将产生资源空闲.

进而 calc 的生产速率降低也是一种回压信号, 告诉上游 src_1 和 src_2 放慢生产速率.

最终生产速度较快的 src_2 受到 calc 回压机制的影响也放慢了生产速度.

可以观察到, 一旦有一个节点阻塞, 其所处的整个管道网络都会遭受影响.

一种解法是拆解 dest_1 和 dest_2, 让他们不使用一个公共的祖先.

```js
const calc = Mass.operators.Calculator.create();
const calc_dep = Mass.operators.Calculator.create();

const src_1 = Mass.operators.MySQLSource.create();
const src_2 = Mass.operators.KafkaSource.create();
const dest_1 = Mass.operators.KafkaSink.create();
const dest_2 = Mass.operators.ElasticsearchSink.create();

const src_1_dep = Mass.operators.MySQLSource.create();
const src_2_dep = Mass.operators.KafkaSource.create();
const dest_1_dep = Mass.operators.KafkaSink.create();
const dest_2_dep = Mass.operators.ElasticsearchSink.create();

env.from(src_1).compute(calc).to(dest_1);
env.from(src_2).compute(calc).to(dest_1);

env.from(src_1_dep).compute(calc_dep).to(dest_2);
env.from(src_2_dep).compute(calc_dep).to(dest_2);
```

```
(src_1) --->
             \
              (calc) ---> (dest_1)
             /
(src_2) --->

(src_1_dep) --->
                 \
                  (calc_dep) ---> (dest_2)
                 /
(src_2_dep) --->
```

## 动态分区的问题

通过 `shard` 动态分区生成的管道, 目前无法对其中的任一节点进行观察管理. 只能通过资源管理器隐式的观察所有末端处理节点.

例如, 对于这样一个管道:

```js
env.from().shard().window().group();
```

由于 window.group 是通过流的元素驱动态创建的, 因此无法对 shard 后的 window 和 group 节点使用 `await` 监听其完成/异常状态.

## 流节点依赖图中的异常处理

一个流计算任务上下文里, 如果两个管道的公共依赖节点并没有发生异常退出, 那么其中一个管道的异常关闭不会影响其他管道的正常工作.

```
                 (mutate) ✔
                /        \
              /            \ 
            /                \
(src_1) --->           ------> (dest_1)
            \        /
              \    /
              (calc) ✗
              /    \
            /        \
(src_2) --->           ------> (dest_2)
```

如果 calc 发生异常退出, 因为 mutate 的存在, src_1 和 dest_1 仍然会正常工作直到遇到错误或正常结束.

## 流处理任务的阻塞性质

流计算任务会持续占用调度器, 直到所有末端处理节点退出. 期间调度队列中的其他任务必须等待.

# 面向开发者的 API

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
class MyCalcualtor extends Mass.stream.operators.Calculator {
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
class MySink extends Mass.stream.operators.Sink {
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
class MySourceEnv extends Mass.stream.Env {
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
class MeansStateAggregator extends Mass.stream.states.StateAggregator {
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
  return this.pipe(new MeansEnv(this, term_condition));
};
```

```js
StateGenerator.prototype.means = function() {
  return this.use(MeansStateAggregator, null);
};
```