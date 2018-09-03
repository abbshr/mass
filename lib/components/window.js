const { EventEmitter } = require("events");
// const { BinaryHeap } = require("../data-structs");

class Window extends EventEmitter {
  constructor(windowTime /* 窗口起点 */, span, lateness /* 等待延迟 */, stateStore) {
    super();
    this.created_at = Date.now();
    this.windowTime = windowTime;
    this.span = span;
    // this.end = windowTime + span;
    this.lateness = lateness || 0;
    this.stateStore = stateStore
    this._expire = null
    // this.ordered = ordered;
    // this.rawTimeseries = this.initTimeSeries();
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

  runTimer() {
    this.timer = setTimeout(() => this.onExpired(), this.span);
  }

  onExpired() {
    // let timeseries = this.productTimeseries();
    this.emit("endspan", timeseries);
    if (this.lateness > 0) {
      this.timer = setTimeout(() => this.emit("expired", this.productTimeseries()), this.lateness);
    } else {
      this.emit("expired", timeseries);
    }
  }

  // productTimeseries() {
  //   return {
  //     // 起始时间
  //     epoch: this.start,
  //     // 时长
  //     span: this.span,
  //     // 推迟时间
  //     lateness: this.lateness,
  //     // 时间序列数据
  //     series: this.rawTimeseries.sorted || this.rawTimeseries,
  //   };
  // }

  insert(elem, time /* 元素的事件时间或处理时间 */) {
    // this.emit("insert", elem, time);
    this.stateStore.collect(elem)
  }

  // defaultInsertBehavior(elem, time) {
  //   if (this.start <= time && time < this.end) {
  //     if (this.ordered) {
  //       this.rawTimeseries.insert(elem);
  //     } else {
  //       this.rawTimeseries.push(elem);
  //     }
  //   } else {
  //     console.log("IGNORE INSERT:", `elem time ${time} out of window range: [${this.start}, ${this.end})`, elem);
  //   }
  // }
}

module.exports = Window