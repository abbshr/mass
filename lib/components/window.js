const { EventEmitter } = require("events");
// const BinaryHeap = require("./heap");

class Window extends EventEmitter {
  constructor(windowTime /* 窗口起点 */, span, lateness /* 等待延迟 */, stateStore) {
    super();
    this.created_at = new Date();
    this.windowTime = windowTime;
    this.span = span;
    // this.end = windowTime + span;
    this.lateness = lateness || 0;
    this.stateStore = stateStore
    this._expire = null
    // this.ordered = ordered;
    // this.rawTimeseries = this.initTimeSeries();

    // this.minOffset = Infinity
    // this.maxOffset = -1

    // 记录多源消费信息 (topic, partition, offset)
    this.multiSrcTable = new Map();
    this.insertedCount = 0
    this.lastInsertedTime = 0
    // this.offsets = new BinaryHeap((aoffset, boffset) => aoffset < boffset)
  }

  get localExpireTime() {
    return this._expire
  }

  markExpire(time) {
    this._expire = time || Date.now()
  }

  // initTimeSeries() {
  //   if (this.ordered)
  //     return new BinaryHeap(({ arrival_time: atime }, { arrival_time: btime }) => atime < btime);
  //   return [];
  // }

  // runTimer() {
  //   this.timer = setTimeout(() => this.onExpired(), this.span);
  // }

  // onExpired() {
  //   // let timeseries = this.productTimeseries();
  //   this.emit("endspan", timeseries);
  //   if (this.lateness > 0) {
  //     this.timer = setTimeout(() => this.emit("expired", this.productTimeseries()), this.lateness);
  //   } else {
  //     this.emit("expired", timeseries);
  //   }
  // }

  insert(elem) {
    if (
      elem.topic &&
      typeof elem.partition === "number" &&
      typeof elem.offset === "number"
    ) {
      this.updateMultiSourceOffset(elem);
    }

    this.insertedCount++
    this.lastInsertedTime = new Date()
    this.stateStore.collect(elem)
  }

  updateMultiSourceOffset(elem) {
    const key = `${elem.topic}:${elem.partition}`;
    let pair = this.multiSrcTable.get(key);
    if (!pair) {
      pair = {
        minOffset: Infinity,
        maxOffset: -1,
      };
      this.multiSrcTable.set(key, pair);
    }

    pair.maxOffset = Math.max(elem.offset, pair.maxOffset)
    pair.minOffset = Math.min(elem.offset, pair.minOffset)
  }
}

module.exports = Window