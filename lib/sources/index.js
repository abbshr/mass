module.exports = operators => {
  // 数据源运算符基类
  // 继承自 Node Readable Stream
  class BlankSource extends operators.Source {
    // 所有 Source 运算符都要实现该方法
    async consume(size) {

    }

    async done() {

    }

    async fault(err) {
      console.log(err);
      throw err;
    }
  }

  operators.register("BlankSource", BlankSource);
};
