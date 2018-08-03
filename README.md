# Mass v2

# 开发更多流处理运算符

## 运算符分类

### 源

```js
class MySource extends require("../operators/source") {
  async consume(size) {
    
  }

  async done() {
    
  }

  async fault(err) {

  }
}
```

### 算子

```js
class MyCalcualtor extends require("../operators/calculator") {
  async calc(elem) {
    
  }

  async done() {

  }

  async fault(err) {

  }
}
```

### 输出

```js
class MySink extends require("../operators/sink") {
  async produce(elems) {
    
  }

  async done() {

  }

  async fault(err) {

  }
}
```