// const SkipList = require("../lib/skiplist");
const bsearch = require("./bsearch");
/**
 * windowsMap:                     WindowsLst:
 * -----------------------         ----------
 * | windowTime | window |         | window |
 * -----------------------         ----------
 * |            |        |         |        |
 * -----------------------         ----------
 * |            |        |         |        |
 * -----------------------   <-->  ----------
 *           ...                       ...
 *           ...                       ...
 * -----------------------         ----------
 * |            |        |         |        |
 * -----------------------         ----------
 * 
 * 快速对象访问.
 * 时序原因, 窗口是顺序追加的, 不能插入比当前最旧窗口还旧的.
 * 修改时要同时操作两个数据结构.
 * 已知窗口时间, 可以通过 Map 常数时间访问.
 * 范围获取窗口, 可以通过跳表/有序数组二分搜索在对数时间完成访问.
 */
class WindowGroup {
  constructor() {
    this.windowsLst = [];
    // this.windowsLst = new SkipList()
    this.windowsMap = new Map()
  }

  /**
   * O(1)
   * @desc 添加一个窗口
   * @param {Window} window 窗口对象 
   * @returns {Window} window
   */
  add(window) {
    // if (this.useSkipList) {
    //   this.windowsLst.insert(start, window);
    // } else {
    //   this.windowsLst.push(window);
    // }
    this.windowsLst.push(window);
    // this.windowsLst.insert(window.windowTime, window)
    this.windowsMap.set(window.windowTime, window)
    return window
  }

  /**
   * O(1)
   * @desc 弹出窗口组中最旧的窗口
   * @returns {Window} window
   */
  evict() {
    const window = this.windowsLst.shift()
    this.windowsMap.delete(window.windowTime)
    return window
  }

  /**
   * O(1)
   * @desc 读取一个窗口
   * @param {Number} windowTime 
   * @returns {Window} window
   */
  get(windowTime) {
    return this.windowsMap.get(windowTime)
  }

  // /**
  //  * @desc 查找一个最近的窗口
  //  * @param {Number} windowTime 
  //  * @returns {Window} window
  //  */
  // find(windowTime) {
  //   const idx = bsearch(this.windowsLst, windowTime, (v, m) => v - m.windowTime, 0, this.windowsLst.size);
  //   let window = this.windowsLst[idx]
  //   return window.windowTime === windowTime && window;
  // }

  get entries() {
    // if (this.useSkipList) {
    //   return this.windowsLst.travel;
    // } else {
    //   const map = new Map();
    //   for (let window of this.windowsLst) {
    //     map.set(window.start, window);
    //   }
    //   return map;
    // }
    // const map = new Map();
    // for (let window of this.windowsLst) {
    //   map.set(window.start, window);
    // }
    // return map;
    return this.windowsMap
  }

  get size() {
    // if (this.useSkipList) {
    //   return this.windowsLst.size;
    // } else {
    //   return this.windowsLst.length;
    // }
    return this.windowsLst.length;
  }

  get empty() {
    return this.size === 0;
  }

  get head() {
    return this.windowsLst[0]
  }

  get tail() {
    // if (!this.useSkipList) {
    //   return this.windowsLst.slice(-1)[0];
    // }
    // throw new Error("not support to get last on a skip list");
    return this.windowsLst[this.size - 1];
  }

  // remove(start) {
  //   if (this.useSkipList) {
  //     this.windowsLst.delete(start);
  //   } else {
  //     throw new Error("can not do random removing on an array");
  //   }
  // }

  /**
   * O(log(n))
   * @param {*} closedLeft 
   * @param {*} openedRight 
   */
  range(closedLeft, openedRight) {
    // if (this.useSkipList) {
    //   return this.windowsLst.range(closedLeft, openedRight);
    // } else {
    //   const startIdx = bsearch(this.windowsLst, closedLeft, (v, m) => v - m.start, 0, this.windowsLst.size);
    //   const endIdx = bsearch(this.windowsLst, openedRight, (v, m) => v - m.start, 0, this.windowsLst.size);
    //   return this.windows.slice(startIdx, endIdx);
    // }
    const startIdx = bsearch(this.windowsLst, closedLeft, (v, m) => v - m.windowTime, 0, this.windowsLst.size);
    const endIdx = bsearch(this.windowsLst, openedRight, (v, m) => v - m.windowTime, 0, this.windowsLst.size);
    return this.windowsLst.slice(startIdx, endIdx);
  }

  // get prevSubSet() {
  //   // if (!this.useSkipList)
  //   //   return this.windowsLst.slice(0, -1);
  //   // throw new Error("not support to get prev sub set on a skip list");
  //   return this.windowsLst.slice(0, -1);
  // }
}

module.exports = WindowGroup;