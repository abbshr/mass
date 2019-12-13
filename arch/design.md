### 可靠性设计

在进一步讨论 client 的影响之前, 先来看了解一下流处理上可靠性的设计. Mass 的可靠性是从计算效率的视角展开的.

因此我们从三个层次/场景考虑计算的可靠性:

- 记录级 redo
- 任务级 redo
- 宕机 redo

#### 记录级容错

我对于数据/记录可靠设计是: 当且仅当末尾运算符处理成功一条记录后, 向 kafka 提交记录的 offset.

在存在聚合的场景下, (如窗口), 通过窗口以及后续状态聚合得到的新的记录, 本身就可能包含来自多个分区的多个 offset. 新记录的先后顺序由于不可预测, 可能较新的 offsets 先于较旧的 offsets 提交了. 在包含旧的 offsets 的记录处理失败后, 由于 record redo 机制, 根据开发者预定的策略, 重试若干次这条记录, 仍然失败的话跳过向后处理, 或者向上抛出错误触发任务级容错. 对于跳过的情况, 自动容错是无法为其做数据恢复的, 需要人为介入解决.

#### 任务级容错

如果向上触发了任务级的容错, 那么整个任务就要进入重试, 这意味着中间的计算结果和局部变量都会丢失. 因为运算符无法干涉任务的状态.

运算符无法搞定, 但可以通过任务级自带的状态存储 `taskstore` 解决, 记录级的 offset 可以存储在 taskstore 中, 每次重新构建流计算时, 初始化 offset 都可以从上次保存的 taskstore 里读取. 这里必须提一点, 依赖 taskstore 的正确性.

如果记录处理失败, 只要保存自己最小的 offset - 1 到 taskstore 即可. 现在无需人为介入了.

#### 容灾

到目前为止, 我所提到的这些场景都是在进程存活的前提. 如果遭遇不可抗因素导致在提交 taskstore 前进程 aborted.

那么我们会丢失 0 ~ window max offset 的数据. 对于这一情况, 设计上的权衡是至少保证接下来所处理的数据是完整的. 但是按照自动化流程, 丢失的数据是无法再次得到处理的.

还有一种办法, 因为现在 window 产出元素的数量是按照 window store 是否可迭代为依据的, 这也是导致出现上述问题的原因.

当可迭代对象在一个 MassElement 里时, 后续的计算(只要不再拆分成多个元素), 都会保证计算的可靠 (不多不少).

但如果将 window store 作为独立元素的话, 流计算可能就失去了意义 (一定程度退化成批处理). 这可能要交给开发者去考量其中利弊.

不过这个方法是从运算符的视角考虑如何解决问题, 如果仅仅在 window 算子上做 trick, 那么后续的运算符将承担更多的逻辑 (处理一个元素内的可迭代对象). 假如将处理链路变成 `[window] -> [sink]`, 那么我们的所有操作都会是带有事务性质的, 并且保持计算链的单一性. 仍然基于上面的方法, 我们将后续的运算符都作为 window 算子的后续状态, 在所有的增量计算结束时, window store 持有了增量的计算结果, 作为一个元素传输给 sink, sink 上实现批量处理即可, 这样无需 taskstore 辅助, 任务初始化时直接从上次提交的 offset 继续即可.

这种做法需要在 sink 成功后 commit 特定 offset, 但因为兼容 0.8 的 kafka client 目前无法使用针对 offset commit 的功能, (只有 commit all offset). 所以可能要继续采取 taskstore 的三方存储迂回解决.

### Mass v2

#### 多源

window 等聚合算子维护一个三元组 (topic, partition, offset). 指示 offset 的来源, 在汇处原子提交时使用.

#### 多汇

多汇情况建议将不同的汇放入独立的 Kafka consumer group, 保证 offset 的提交互不影响.

考虑到管道网络拓扑结构潜在的复杂性, offset 维护方案需要考虑, 设计与变更在这里记录.

### 任务层面的设计

使用类似 TaskStore 的对象 OffsetManager 存储 offset. 每次任务启动优先从 OffsetManager 里提取 offset, 运算符处理成功后, 提交 offset 变更到 OffsetManager.

### 网络拓扑层面的设计

那么 offset 由哪些运算符提交变更? 如何计算变更? OffsetManager 以什么结构存储这些信息? 如何选择合适的变更信息存储?

我们希望的是优先提供严格的数据无失保证以及尽力而为的计算效率. 退而求次才是尽力而为保证数据无失.

首先我们对管道网进行一个抽象的建模. l 个 source, m 个 calc, n 个 sink. 彼此相连, 产生了 l.m.n 条独立的管道.

假设 l 个 source 都是携带偏移量信息的数据源. 以 kafka 为例, 他们来自不同的 topic, partition.

为了保证数据无失, 就要确保每条管道在完成一次处理后, 数据偏移量都得到提交.

简化需求, 就是该消费组对各个 (topic, partition) 序对都正确记录了 offset. 正确的 offset 这里指定为最小的 offset.

为了提高提交的效率, 运算符可以直接更新 OffsetManager 内部数据结构, 而不是直接提交到底层存储. (类比 page cache)

那么 om 可以维护一个表, topic-partition 为 key, value 应该是最小的 offset 了. 因为这个最小值因该是所有 sink 在同一 topic,partition 下的 offset 最小值, 所以应该暂存每个 sink 的 offset 更新值, 在存储时计算最小值.

但是 calc 中存在一种类型的 op, 如 select, drop. 他们会 **丢弃** 一部分元素, 而不会进入到后继 op 里.

所以如果仅仅计算 sink 的 offset, 当大量的元素被丢弃时, poweroff 会导致低效的恢复流程. (要从被丢弃的元素 offset 之前再次开始)

因此计算时需要考虑这些不满足要求的元素: 如果一个元素不再参与接下来的运算, 那么应该将它的对应的 (t,p,o) 三元组更新.

OffsetManager 维护的结构可以是:

```js
OffsetManager {
  <topic>;
  <partition>;
  <OPEARTOR_POINTER>;
  <offset>;
}
```

因为我们更关注 topic-partition, 所以将 t,p 作为 key, 存在 hash 表里:

```js
<t-p: String>: {
  <op: Operator>: <offset: Number>;
}
```

存储层为:

```js
<t-p: String>: <minoffset: Number>
```

### 基于距离计算 op 之间的可达性

回到刚才的问题, 我们要把非 sink 的 op 也放到这个 hash 表里. 那么计算 offset 最小值的过程就变为:

计算 OffsetManager hash 表的所有 op 组成的所有链路中最小的 offset, 而每条链路的 offset 的计算方法是: 取当前链路所经路过的在 hash 表中的 op 节点, 计算他们的最大值.

分析 OffsetManager hash 表内的 op 是如何构成链路的, 如果通过 env 对象的网络拓扑来检查的话, 要从根节点遍历 (从叶节点回溯的话, 存在多个入度的问题, 也很复杂), 复杂度高, 每次提交成本很高. 因此我们采用一种基于距离计算 op 之间可达性的方法. 用 distance 函数在常数时间检查两个 op 是否是连通的.

```js
distance(op1, op2);
```

distance 函数使用一个两个预查表来记录各个算子之间的举例. 预查表通过动态规划策略构建: 每次添加新的 op, 通过已有的行列填补预查表相应行列的距离值. 如果 op1 - op2 之间存在更短的路经, 则不更新.

两个预查表分别为: 正排索引, 倒排索引. 倒排用来加速查询 (所有可到达此 op 的 op 集合).

(还没写完, 有时间补)
