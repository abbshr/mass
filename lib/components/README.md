# 公共组件

## Mutex

`Mutex` 基于 Redis Cluster 提供了互斥锁能力.

目前评估可能出现问题:

- 如果锁续租进度被阻塞的时长超过锁过期的 TTL, 互斥条件可能会被破坏.

## Bus

`MassBus` 作为消息总线, 为所有任务提供信号传递能力.

## Store

`TaskStore` 为任务的提供通用的状态存储能力.

## Element

流中的 `元素`(记录) 数据结构. 为流计算提供扩展能力.

## Window / WindowGroup

窗口(组)数据结构, 为窗口算子的基本能力提供支持.