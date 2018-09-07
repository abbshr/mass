流运算符实现
===

## 术语与符号

- op: 操作符对象. Source, Calculator, Sink 的实例.
- elem: 流元素. MassElement 实例

## 运算符基础属性与方法

### `done()`

运算符正常结束的 handler

### `fatal(err)`

运算符异常退出的 handler

### `cleanup()`

实现运算符关闭前的资源回收清理操作

### `op.terminate()`

手动终止运算符工作.

### `op.maxRetryAttemps`

运算符的最大重试次数.

在不同场景下意义不同, 对于 Source, 表示读取源数据的最大重试次数. 其他类型的运算符表示对于每个元素的记录级最大重试次数.

## `Source`

源.

### `consume([size])`

- size: Number, 数据长度, 可忽略.

实现触发数据拉取的逻辑.

### `op.attempConsume(data)`

- data: Any

拉取底层资源可能需要在 `consume` 作用域之外实现.

自定义的数据拉取实现需要调用 `attemptConsume` 方法完成.

### `op.recovery(err, [size])`

拉取底层资源可能需要在 `consume` 作用域之外实现.

自定义的容错过程需要调用 `recovery` 方法完成.

### `crunch(data)`

实现对原始数据的处理逻辑. 由 `attemptConsume` 调用. 可选择性实现.

如果 `consume` 方法能够包含全部拉取处理逻辑, (无需 `attemptConsume`) 则不要实现.

### `op.product(data)`

- data: Any, 待打包成 MassElement 的数据

将数据打包成 `MassElement` 并推入输出缓冲区.

### `failback(err)`

- err: Error

实现操作容错的逻辑.

#### `op.redo([size])`

- size: Number, 数据长度, 可忽略.

在 `failback` 作用域里可以调用 `redo` 重试.

## `Calculator`

算子.

### `calc(elem)`

- elem: MassElement, 算子的输入元素

实现计算的核心逻辑.

#### `op.createStateStore()`

根据配置的状态生成器创建一个状态存储对象.

#### `op.product(data)`

- data: Any, 待打包成 MassElement 的数据

将数据打包成 `MassElement` 并推入输出缓冲区.

### `reducer(data)`

- data: Any, 来自 `product(data)` 的数据

实现最后一步聚合计算的逻辑, 由 `product` 方法自动调用.

默认实现为透传, 返回 data.

### `failback(err, elem)`

- err: Error
- elem: MassElement, 出现错误的元素

实现记录级容错的逻辑.

默认实现 `throw err`.

#### `op.redo(elem)`

- elem: MassElement, 待重试的元素

在 `failback` 作用域里可以调用 `redo` 重试这条记录的运算.

### `op.setStateGenerator(gen)`

### `op.use(StateClass, ...cfg)`

### `op.reduce(fn)`

### `op.gen`

### `op.states`

## `Sink`

汇.

### `produce(elem)`

- elem: MassElement, 待输出的元素

实现了将 elem 输出的逻辑.

### `failback(err, elem)`

- err: Error
- elem: MassElement, 出现错误的元素

实现记录级容错的逻辑.

默认实现 `throw err`.

#### `op.redo(elem)`

- elem: MassElement, 待重试的元素

在 `failback` 作用域里可以调用 `redo` 重试这条记录的运算.

### `commit(elem)`

实现了提交元素包含的 offsets 的逻辑.

默认为空

### `rollback(elem)`

实现了回滚元素包含的 offsets 的逻辑.

默认为空

# 状态存储

# 记录级容错机制

- `failback()`

## 错误分类处理

### 钩子触发顺序

#### 正常结束

1. `done()`
2. emit `"operator_done"`
3. `cleanup()`
4. emit `"operator_close"`

#### 容错过程

1. `failback(err, ...args)`
2. failback 结束, 返回运算符上下文继续处理
3. failback 异常, `purge(err)`, 并进入异常结束流程

#### 异常结束

1. `fatal(err)`
2. emit `"operator_error"`
3. `cleanup()`
4. emit `"operator_close"`

在 `failback` 作用域里可以区分三种等级的错误:

- 可重试: `op.redo()`, 如网络异常等, 可通过一定重试次数 fix, 当超出最大重试次数时, 被视为不可恢复错误.
- 可跳过: `return`, 比如一条脏数据, 无法被处理, 在日志打点或者报警后, 可以跳过处理.
- 不可恢复: `throw err`, 比如初始化遇到不可逆因素 (如配置错误或者代码 bug 等) 导致运算符无法使用.

当运算符遇到不可恢复错误时, 直接异常退出, 触发任务级容错.