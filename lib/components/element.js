const COPY = Symbol("COPY");

/**
 * @description 流元素数据结构
 * 一般情况, 每个算子的输入输出都是不同的 MassElement 对象.
 * 也有特殊的算子如 tap, mutate, 允许输入直接 pass-through.
 * MassElement 封装了原始的信息, 并安装了扩展信息,
 * 对路径追踪, 记录级重试等基础能力提供支持.
 * 
 * 目前尽量不要创建超过一层的对象嵌套结构, (但 record 字段可以是一个一层结构对象).
 * 
 * @member {Date} eventTime 原始信息的生成时间
 * @member {Date} packedTime 打包成 MassElement 对象的时间
 * @member {Array<Operator>} path 元素的流经路径, 记录操作符的引用
 * @member {Number} retries 重试次数
 * @member {Operator} lastAccessedBy 上一次访问的运算符
 * @member {Array<Any>} shards 分片特征值
 * @member {Any} … 其他自定义的属性
 */
class MassElement {
  /**
   * @param {Object} struct 原始数据
   * 
   * @desc struct 为 MassElement 对象时, 属于共享模式, 返回相同的对象引用.
   */
  constructor(struct, sharable = true) {
    // element shareable 模式
    if (struct instanceof this.constructor) {
      if (sharable) {
        return struct;
      }
    }

    struct = this.translate(struct);

    // new 模式
    Object.assign(this, {
      path: [],
      retries: 0,
    }, struct);

    // 如果存在, 获取事件时间
    const eTime = struct.eventTime || (struct.record && struct.record.eventTime);
    this.eventTime = eTime ? new Date(eTime) : new Date();
    this.packedTime = new Date();

    if (Array.isArray(struct.shards)) {
      this.shards = [...struct.shards];
    } else {
      this.shards = [];
    }
  }

  translate(data) {
    data = this.clone(data);

    if (data && data[COPY]) {
      data = data[COPY];
      // 其他类型对象不易深拷贝, 直接展开, 目前仅支持到第一层复制.
      // note: 如果有 record 对象, 则拷贝第一层 record.
      if (data.hasOwnProperty("record")) {
        let record = this.clone(data.record);
        record = (record && record[COPY]) || record;
        return Object.assign(data, { record });
      } else {
        return data;
      }
    } else {
      return { record: data };
    }
  }

  clone(data) {
    switch (typeof data) {
      case "object":
        // 枚举一些基本可复制类型
        if (data === null) {
          return data;
        } else if (data instanceof Array) {
          return Array.from(data);
        } else if (data instanceof Buffer) {
          return Buffer.from(data);
        } else if (ArrayBuffer.isView(data)) {
          return new data.constructor(data);
        } else if (data instanceof Map) {
          return new Map(data);
        } else if (data instanceof Set) {
          return new Set(data);
        } else if (data instanceof Date) {
          return new Date(data);
        } else {
          return { [COPY]: { ...data } };
        }
      default:
        // 原始类型
        return data;
    }
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

  addShardingInfo(trait) {
    this.shards.push(trait);
  }

  // 用于生成输入数据的拷贝
  static from(data) {
    return new MassElement(data, false);
  }
}

class MassElementSet extends MassElement {

}

module.exports = {
  MassElement, MassElementSet,
};
