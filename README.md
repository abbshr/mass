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

# User Handbook

## 快速上手

Mass 库有一个顶层命名空间 `mass`, 其上导出了常用的核心构件及其 API.

```js
const mass = require("@wac/mass");
```

作为一个任务调度框架, Mass 的第一层结构是调度器. 所有任务都通过调度器调度执行.

我们可以通过 `MassTaskScheduler` 类使用调度器:

```js
const { MassTaskScheduler } = mass;

const scheduler = new MassTaskScheduler();
```

新建调度器默认会有 `concurrency = 1, maxRetryTimes = 5` 这样的配置. 表示调度器同时可执行的任务数 1, 默认执行失败的任务最大重试次数为 5.

你可以创建多个调度器, 每个有不同的配置.

接下来你就可以编写自己的任务逻辑了.

任务是 Mass 里的 I/O 和计算的统一抽象, Mass 几乎所有的能力都是凭借任务发挥出来的.

我们可以通过 `MassTask` 类描述一个任务:

```js
const { MassTask } = mass;

const task = new MassTask();
```

`MassTask` 提供了很多参数可供任务的配置.

有些可以覆盖调度器的对其上任务的默认值, 例如:

- maxRetryTimes: 对每个任务设置自己的最大重试次数 (而不是使用调度器的默认值)

而其中最重要的配置是 `executor: AsyncFunction`. `executor` 表示任务逻辑. 因为如果不配置 `executor`, 那么任务不做任何事情就结束了.


```js
const task = new MassTask({
  async executor(input) {
    calculateTaskResult(input);
  }
});
```

普通任务的 `executor` 方法第一个参数 `input` 表示 **任务的输入数据**. 数据是在定义 **调度模式** 时传入的, MassTask 提供了很多配置调度模式的 API (具体使用参见 API 手册):

- `task.on(signal)`
- `task.at(cronExpr)`
- `task.at_every(cronExpr)`
- `task.sched(input)`
- `task.grab(input)`

这些 API 声明了任务的调度方式, 有些 API 如 `task.on`, 并不提供显式传入指定数据的方法, 因为这类 API 会隐式传入特定的数据, 像信号和载体等. 在任务执行之前, 必须选择一种调度方式通知调度器.

现在选择一个调度方法, 你会发现程序报错了. 任务找不到 `scheduler`. 如上所述, 每个任务必须有一个关联的调度器.

Task 上绝大多数 API 都是要靠调度器发挥功效的.

你可以在声明任务时传入一个调度器实例 `scheduler` 配置:

```js
const task = new MassTask({
  scheduler
});
```

或者在任务声明后, 调用 `task.join(scheduler)` 方法完成关联.

还有一种更推荐的方式: 用调度器的 `scheduler.spawnTask(TaskClass, config)` API 创建任务.

```js
const task = scheduler.spawnTask(MassTask, {
  async executor() {}
});
```

这种方式创建任务的好处是你不必每次在配置中或调用 `join` 方法指定调度器了, 降低出错的概率. `spawnTask` 的第一个参数是一个任务的类, 比如 `MassTask`. 第二个参数是任务的配置, 用于传给第一个类的构造器.

> 注意: 每个任务在执行完毕之前建议只关联一个调度器, 如果关联了多个调度器, 可能出现让你意想不到的问题.

OK, 到此为止, 你已经可以使用 Mass 来创建一个任务了. 这里有个完整的基本示例:

```js
// 一个定期下载文件并做格式化的任务
const { MassTask, MassTaskScheduler } = require("@wac/mass");

const scheduler = new MassTaskScheduler();
const downloadTask = scheduler.spawnTask(MassTask, {
  async executor() {
    // 假定我们已经编写了 download, save, transform 方法.
    const booklist = await download("http://ebook.com/booklist");
    const books = await Promise.all(
      booklist.map(bookname => download(`http://ebook.com/getBook?name=${bookname}`))
    );

    await Promise.all(books.map(book => save(transform(book))));
  }
})
.at("0 9 * * *")
.repeat();
```

## 子任务

熟悉了基本使用? 接下来我们可以看下如何对上面那个任务进行优化了. 我们可以发现上面的例子是一个偏重 I/O 的任务 (当然我们还不知道 transform 函数的实现, 假定它没有很大的计算量), 首先下载一个书名表, 然后根据书名并发地下载每本书的内容, 并对下载内容做格式化和存储处理.

我们假设一种可能会使任务变的低效的情况: 如果书籍列表比较大, 并且网络延迟很高. 当我们进行到下载书内容时突然发生了网络超时, 你的任务需要重新开始下载书籍列表, 而前一个异常在这次重试过程中很可能再次发生.

MassTask 提供了一种 **子任务** 能力, 可以最大程度减少因网络出错带来的重试开销, 我们看下如何操作:

首先定义下载书名表的任务:
```js
const { MassTask, MassTaskScheduler } = require("@wac/mass");

const scheduler = new MassTaskScheduler();
const downloadBooklistTask = scheduler.spawnTask(MassTask, {
  async executor(_, proceed) {
    // 假定我们已经编写了 download, save, transform 方法.
    const booklist = await download("http://ebook.com/booklist");

    proceed(booklist);
  }
})
.at("0 9 * * *");
```

接下来定义后续任务, 并构建两个任务的依赖关系:

```js
downloadBooklistTask.addChildTask(MassTask, {
  async executor(booklist, proceed) {
    // 假定我们已经编写了 download, save, transform 方法.
    const books = await Promise.all(
      booklist.map(bookname => download(`http://ebook.com?name=${bookname}`))
    );

    await Promise.all(books.map(book => save(transform(book))));
  }
});
```

我们观察一下变化: 首先 `executor` 里增加了第二个参数 `proceed`. `proceed: Function` 参数是一个函数, 表示当前任务执行完毕的回调. 如果有子任务, 那么执行 `proceed(input)` 来通知子任务执行.

`proceed` 函数有一个参数, 传入作为子任务 `executor` 的第一个参数, 如上所示.

调用父任务的 `task.addChildTask(task)` 方法即可建立二者的联系.

子任务的特点是, 当且仅当父任务成功完成时, 子任务才有机会被调度, 并且子任务的失败不会导致父任务的重试.

现在, 无论后续下载文件时怎么出错, 都不会再引起下载列表的重试了.

由于我们想节省下载文件的时间, 我们做了并发下载, 可是代码中的并发一旦有一个失败, 整个下载子任务也失败了. 如果我们已经下载完成了 99% 的进度, 只有 1% 的失败导致整个进度归零, 也是我们不想看到的. MassTask 还提供了另一种优化方法, 将每个并发作为一个独立的任务, 最小化重试的开销:

调用父任务的另一个方法: `task.mapChildTasks(task)`. 通过这一方法建立关联的子任务, 每个子任务都是动态创建的, 并且输入数据都是父任务传入数据的列表中的元素.

```js
downloadBooklistTask.mapChildTasks(MassTask, {
  async executor(bookname) {
    // 假定我们已经编写了 download, save, transform 方法.
    const book = await download(`http://ebook.com?name=${bookname}`);
    await save(transform(book));
  }
});
```

这次我们不再需要 `downloadBookTask` 任务了, 因为都已经拆分到 `downloadEachBookTask` 内了.

因为调度器的默认并发调度数为 1, 为了提高并发下载能力, 我们把它提升到 5. 不过当前还不能够对已经实例化的调度器重新配置并发度.

```js
const scheduler = new MassTaskScheduler({ concurrency: 5 });
```

现在, 我们的任务表现优异了: 控制并发度, 并且任何子任务的失败只会导致自己那部分的重试.

## 任务级容错

前面我们对任务的优化是主要是考虑到失败重试. 那么一个任务失败后要怎么处理? (怎么重试?)

Mass 对于这个问题提供了一个简单方案: 容错策略类 `FaultTolerateStrategy`.

每个任务在创建时都内置一个默认的容错策略: `DefaultFaultTolerateStrategy`

可以调用任务的 `task.useFaultTolerateStrategy(FaultTolerateStrategyClass)` 方法配置你想要的容错策略.

容错策略类存放在 `mass.strategies` 命名空间下:

```js
const { strategies } = mass;
```

你可以基于 `FaultTolerateStrategy` 类派生出自定义的容错策略类:

```js
class MyFaultTolerateStrategy extends strategies.FaultTolerateStrategy {
  async effective(input, err) {
    // my fault tolerate logic ...
  }
}
```

如果比较常用, 可以调用 `register()` 方法注册这个策略类, 便于从 `strategies` 命名空间直接调用.
```js
strategies.register("MyFaultTolerateStrategy", MyFaultTolerateStrategy);
```

关于自定义容错策略类及相关的话题, 我们放到后面的开发者手册里详细讨论.

## 如何处理已死亡任务?

我们的任务树里, 那些达到最大重试次数的任务会被放到调度器的 **死信队列** 里, 并被标记为 `DEAD`, 称之为已死亡任务.

你可以在合适的时间用合适的方法将它们 "复活":

```js
scheduler.failback();
```

`failback` 方法会将死信队列里的任务依次弹出, 以普通调度策略重新交给调度器压入调度队列里. 重生的机会只有一次, 如果依旧失败, 那么会再次被放到死信队列里, 并再次标记为 `DEAD`.

当然, 你可以选择不复活他们, 而是简单的做些统计, 也是可行的. 详细讨论我们也放到开发者 API 手册里.

## 进入流计算领域

当你发现你的任务存在大量的数据处理逻辑, 并且它可能是一个后台常驻型任务. 你的任务是否在处理过程中内存暴涨? 是否处理速度很慢? 是否感觉数据管道维护成本很高?

如果上述条件有满足的, 那么请进入流处理领域. 流处理是 Mass 框架为任务提供的一个扩展功能.

通过使用流任务, 你可以对原有的任务做出优雅简单的改变, 并保持资源开销在一个平稳的变化过程.

我们从一个例子来看 Mass Stream Process 的基本能力.

流任务和前面接触过的任务类似, 因为流任务就是基于普通任务建立起来的.

```js
const { MassStreamTask } = mass;
```

切换到流处理上下文后, 你所需要的能力基本都通过 `mass` 命名空间暴露出来的. 创建任务实例的方式也基本相同:

```js
const streamTask = scheduler.spawnTask(MassStreamTask, {
  async streamProcessExecutor(env) {
    // stream logic
  }
});
```

现在请注意 `MassStreamTask` 和 `MassTask` 实例配置上的最主要差别: `streamProcessExecutor: AsyncFunction`.

流处理任务使用 `streamProcessExecutor` 描述任务逻辑. `streamProcessExecutor` 的第一个参数是 `env: Env`, 它是开启流计算上下文的大门, 称为 **流处理环境对象**.

通过 `env` 对象, 也可以使用绝大多数流计算的功能.

`Env` 的实例也是所有 **运算符** 的作用域. 这里不得不介绍下 Mass 运算符的概念. 什么是运算符?

在流计算任务里, 整个流处理流程几乎全部由各种各样的运算符编排连接而成的. 运算符是流式数据处理的核心. 定义了计算规则: **何时对何物做何计算 & 何时产出何物**. 不同运算符的组合也是一系列不同计算规则的组合. 所以, 将传统数据处理任务改造成为流式数据处理任务的核心就是将原有算法 (一整套计算规则) 拆分成运算符.

但是独立的运算符是不能够直接使用的, 因为它难以管控, 于是我们通过 `Env` 的实例包裹一个运算符实例以实现对其控制.

运算符在 Mass 里有三个分类:

- Source Op: 源运算符
- Calculator Op: 算子
- Sink Op: 输出运算符

流计算至少有个数据源, 我们先来声明一个数据源:

```js
const datasource_env = env.from(env.operators.Source.create(cfg));
```

env 上存在一些便捷的方法用于创建不同类型运算符的环境. `env.from(source)` 方法创建了一个新的环境对象, 里面包含一个源运算符.
`from()` 的参数是一个运算符实例. 为了便捷的操作, `env` 对象上导出了流处理上下文里常用的子命名空间, 比如通过 `env.operators` 可以使用所有已加载的运算符. 每个运算符都有个静态方法 `Op.create`, 返回一个 OP 新的实例.

我们继续向后定义计算过程:

```js
await datasource_env
  .compute(env.operators.Calculator.create(cfg))
  .to(env.operators.Sink.create(cfg));
```

第二部操作我们将前面生成的数据源连接到 `compute` 方法产生的算子上, 并通过 `to` 方法将算子连接到一个输出目标上.

除此之外, 我们还使用了 `await` 关键字. 你可以随意在 `env` 上使用 `await` (注意根据 js 的优先级规则, await 等待的是最终生成的 env.), 表示等待该环境对象结束或抛出异常, 环境对象的结束代表内部运算符的结束, 异常同理.

> 这里需要提示, 如果你并没有 await 一个管道中的任何 env 对象, 那么当某个 env crash 时, 则会全局出发 `unhandledRejection` 事件.

当然, 如果你对逻辑不依赖某条管道的结束, 你完全可以不使用 await, 因为流处理任务已经帮你做好了资源管理和监控. 在所有运算符退出前, 流任务是不会提前结束的, 因此如果这是一个长期任务, 那么最好不要在后面添加其他同优先级的任务 (除非是做清理等收尾工作的任务)!

到此为止, 一条简单但完备的管道就构建完成了. 我们来看下完整的代码:

```js
const streamTask = scheduler.spawnTask(MassStreamTask, {
  async streamProcessExecutor(env) {
    env
      .from(env.operators.Source.create(cfg))
      .compute(env.operators.Calculator.create(cfg))
      .to(env.operators.Sink.create(cfg));
  }
})
.sched();
```

OK, 现在流处理任务开始运行了. 更多环境和运算符相关的能力和 API 之后继续讨论.

### 注意事项

#### 管道回压的副作用

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

#### 动态分区的问题

通过 `shard` 动态分区生成的管道, 目前无法对其中的任一节点进行观察管理. 只能通过资源管理器隐式的观察所有末端处理节点.

例如, 对于这样一个管道:

```js
env.from().shard().window().group();
```

由于 window.group 是通过流的元素驱动态创建的, 因此无法对 shard 后的 window 和 group 节点使用 `await` 监听其完成/异常状态.

#### 流节点依赖图中的异常处理

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

#### 流处理任务的阻塞性质

流计算任务会持续占用调度器, 直到所有末端处理节点退出. 期间调度队列中的其他任务必须等待.

## 是时候考虑程序的稳健和可伸缩性了

## 使用习惯和编程范式

框架提供两种编码习惯的选择.

对于习惯 **配置化** 编码的开发者, 可以选择开箱即用模式, 因为框架里已经预置了所有 **可用的** 组件:

```js
const scheduler = new MassTaskScheduler(scheduler_cfg);
scheduler.spawnTask(MassTask, {
  async executor(input, proceed, bus) {}
}).sched();

scheduler.spawnTask(MassStreamTask, {
  async streamProcessExecutor(env, bus) {}
}).sched();
```

而对于那些习惯使用面向对象模式的开发者, 或者需要对预置策略进行一些自定义调整的使用者来说, 继承和重载的思路可能更适合一些:

```js
class MyScheduler extends MassTaskScheduler {
  async failback() {
    
  }
}

class MyTask extends MassTask {
  async executor(input, proceed, bus) {

  }
}

class MyStreamTask extends MassStreamTask {
  async streamProcessExecutor(env, bus) {

  }
}

const scheduler = new MyScheduler(scheduler_cfg);
scheduler.spawnTask(MyTask, {}).sched();
scheduler.spawnTask(MyStreamTask, {}).sched();
```

> 建议使用第二种编码方式. 一个原因是这种书写方式代码结构清晰, 可读性高, 较容易维护.
> 另外可以非常容易的修改或增加原有组件的行为, 而扩展开发新组件的成本也会变得很低廉.

## 你的项目目录结构该如何组织?

基于 Mass v2 的项目可以以如下目录结构组织代码.

```
- lib/ # 存放任务逻辑相关的代码
- schedulers/ # 存放自定义的调度器类
- tasks/ # 存放自定义的任务类
- operators/ # 存放自定义的操作符类
  - sources/
  - calculators/
  - sinks/
- states/ # 存放自定义的状态聚合器类
  - states/
  - aggregators/
- fault-tolerate-strategies/ # 存放自定义的容错策略类
- envs/ # 存放自定义的环境类
- gens/ # 存放自定义的状态生成器类
- components/ # 存放通用的组件内逻辑和数据结构
- scaffold.js # 配置和组装代码
- bootstrap.js # 入口
```

## API

# Developer Handbook

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
  async produce(elem) {

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