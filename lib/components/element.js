/**
 * @description 流元素数据结构
 * 一般情况, 每个算子的输入输出都是不同的 MassElement 对象.
 * 也有特殊的算子如 tap, mutate, 允许输入直接 pass-through.
 * MassElement 封装了原始的信息, 并安装了扩展信息,
 * 对路径追踪, 记录级重试等基础能力提供支持.
 * 
 * @member {Date} eventTime 原始信息的生成时间
 * @member {Date} packedTime 打包成 MassElement 对象的时间
 * @member {Array<Operator>} path 元素的流经路径, 记录操作符的引用
 * @member {Number} retries 重试次数
 * @member {Operator} lastAccessedBy 上一次访问的运算符
 * @member {Any} … 其他自定义的属性
 */
class MassElement {
  /**
   * @param {Object} struct 原始数据
   * 
   * @desc struct 为 MassElement 对象时, 属于共享模式, 返回相同的对象引用.
   */
  constructor(struct) {
    // element shareable 模式
    if (struct instanceof this.constructor) {
      return struct;
    }

    // new 模式
    Object.assign(this, {
      eventTime: struct.eventTime ? new Date(struct.eventTime) : new Date(),
      packedTime: new Date(),
      path: [],
      retries: 0,
    }, struct);

    // this.eventTime = this.eventTime || new Date(struct.eventTime || undefined);
    // this.packedTime = new Date();

    // this.path = [];
    // this.customFields = {};
    // this.retries = struct.retries || 0;
    // this.maxRetryAttemp = meta.maxRetryAttemp || 3;
  }

  markTimestamp(timestamp) {
    this.eventTime = new Date(timestamp);
  }
  markAccessOperator(op) {
    this.path.push(op);
    this.lastAccessedBy = op;
  }
  markWindowTime(timestamp) {
    this.windowTime = new Date(timestamp);
  }

  // setCustomField(k, v) {
  //   this.customFields[k] = v;
  // }
  // getCustomField(k) {
  //   this.customFields[k];
  // }
}

class MassElementSet extends MassElement {

}

module.exports = {
  MassElement, MassElementSet,
};
