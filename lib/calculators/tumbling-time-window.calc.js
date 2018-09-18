const Window = require("../components/window")
const WindowGroup = require("../components/window-group")
const moment = require("moment")

module.exports = operators => {

  /**
   * @name TumblingTimeWindowCalculator tumbling 时间窗口算子
   * @extends mass.stream.operators.WindowCalculator
   * 
   * Calculator 类操作符, 根据 options.pattern 的配置维护元素的时间窗口, 不同窗口之间没有重叠.
   * 
   * - 窗口时间
   * 满足 options.pattern 的时间戳, 当前窗口时间在 `waterMarker` 保存
   * 
   * - 窗口的创建
   * 元素推动窗口的创建
   * 如果元素的时间大于 waterMarker 且不属于任何已有窗口的窗口时间时, 新的时间窗口会创建, 元素插入新的窗口, 元素时间所属的 options.pattern 时间戳作为新的窗口时间.
   * 
   * - 窗口的销毁检查
   * 
   * 1. 被动检查
   * 当有新元素进入算子时, 运行一次检查, 标记或者清理可驱逐的窗口
   * 
   * 2. 主动检查
   * 定期执行检查, 如果检查超过限制时间, 则停止, 并等待下一次检查
   * 
   * 当有新的窗口创建时, 旧的窗口即标记为过期, 当检查时间大于 标记时间 + lateness 时, 窗口为可驱逐, 新的元素将不允许写入该窗口.
   * 
   * 每次检查后可能将 waterMarker 向前推动到一个后续的时间窗口.
   * 窗口驱逐时, 执行算子的 product(reducer()) 方法, 向下一个运算符产出新的元素
   */
  class TumblingTimeWindowCalculator extends operators.WindowCalculator {
    /**
     * @desc 无重叠的时间窗口, 使用事件时间控制窗口的创建驱逐
     * @param {mass.stream.Env} env 
     * @param {Object} options
     * @param {String} options.span 窗口大小, 限制在一天之内. 窗口的创建模式是以当天凌晨为起点, 计算当前时间属于哪个窗口. 通过 ![ISO8601 Duration](https://en.wikipedia.org/wiki/ISO_8601#Durations) 表示法定义
     * @param {Number} options.lateness 延迟等待, 在窗口销毁前继续等待额外的一段时间. 通过 ![ISO8601 Duration](https://en.wikipedia.org/wiki/ISO_8601#Durations) 表示法定义
     * 
     * @example
     * new TumblingTimeWindowCalculator(env, {
     *    span: "PT15M", // 15 m
     *    lateness: "PT10S", // 10 s
     * })
     */
    constructor(env, { span, lateness, iterable }) {
      super(env)

      this.iterable = iterable || true
      this.span = moment.duration(span).asMilliseconds()
      this.windowGroup = new WindowGroup()
      this.waterMarker = -1
      this.lateness = moment.duration(lateness).asMilliseconds() || 0
      this.evictCheckFrequency = 500
      // 最长检查时间 10 ms
      this.maxCheckDuration = 10
      this.runEvictChecker()
    }

    /**
     * @desc 选择一个窗口, 如果需要创建新窗口, 返回 undefined, 如果元素已过期, 返回 error, 如果窗口存在, 返回窗口
     * @param {Number} windowTime 窗口时间
     * @returns {Window | Error | Undefined} window | error | undefined
     */
    selectWindow(windowTime) {
      // 忽略 waterMarker 之前的元素
      if (windowTime >= this.waterMarker) {
        return this.windowGroup.get(windowTime)
      } else {
        return new Error("元素迟到时间超过最大限制, 将被丢弃")
      }
    }

    /**
     * @desc 创建一个时间窗口
     * @param {Number} windowTime 
     * @returns {Window} window
     */
    createWindow(windowTime) {
      const window = new Window(
        windowTime, this.span, this.lateness, this.createStateStore()
      )

      return this.windowGroup.add(window)
    }

    /**
     * @desc 定期执行 checkWindowEvictable() 检查
     */
    runEvictChecker() {
      this.evictChecker = setTimeout(async () => {
        await this.checkWindowEvictable()
        this.runEvictChecker()
      }, this.evictCheckFrequency)
    }

    /**
     * @desc 筛选可驱逐的窗口
     * 逻辑等同于 evictWindows()
     * 但是限制了运行时间, 如果超出最大限制, 则停止检查.
     */
    async checkWindowEvictable() {
      const startMarker = process.hrtime()

      if (this.windowGroup.empty) {
        return
      }

      const latestWindowTime = this.windowGroup.tail.windowTime

      for (let [windowTime, window] of this.windowGroup.entries) {
        const [sec, nanosec] = process.hrtime(startMarker)
        const elapse = sec * 1000 + nanosec / 1000000

        // 耗时超过 maxCheckDuration 则停止检查
        if (elapse > this.maxCheckDuration) break
        // console.log("check 耗时", elapse)

        // 顺序筛出所有小于最新窗口时间的 window
        if (windowTime < latestWindowTime) {
          await this.markExpireOrEvict(window)
        }
      }

      // 如果需要, 前进 watermarker
      if (this.windowGroup.head.windowTime > this.waterMarker) {
        this.forwardWaterMarker(this.windowGroup.head.windowTime)
      }
    }

    /**
     * @desc 驱逐所有过期窗口, 并将窗口状态依次输出
     */
    async flushWindows() {
      const latestWindowTime = this.windowGroup.tail.windowTime

      for (let [windowTime, window] of this.windowGroup.entries) {
        // 顺序筛出所有小于最新窗口时间的 window
        if (windowTime < latestWindowTime) {
          await this.markExpireOrEvict(window)
        }
      }

      // 如果需要, 前进 watermarker
      if (this.windowGroup.head.windowTime > this.waterMarker) {
        await this.forwardWaterMarker(this.windowGroup.head.windowTime)
      }
    }

    /**
     * @desc 以一天为起点, 计算给定时间戳所属的窗口时间(sec)
     * @param {Date | Number} timestamp 
     * @returns {Number} 秒 UNIX FORMAT
     */
    getWindowTime(timestamp) {
      const epoch = (new Date(timestamp)).setHours(0, 0, 0, 0)
      return epoch + ((timestamp - epoch) / this.span >> 0) * this.span
    }

    /**
     * @desc 标记窗口过期或者直接驱逐窗口 (执行驱逐操作时, 需要保证当前窗口是 head)
     * @param {Window} window 
     */
    async markExpireOrEvict(window) {
      const now = Date.now()
      // 标记过期
      if (!window.localExpireTime) {
        window.markExpire(now)
      }

      // 无滞留配置或当前时间距离上次标记的窗口的本地过期时间间隔超过 lateness 配置
      // 输出窗口状态生成新的 MassElement
      // notice:
      // 窗口弹出策略采用被动 + 主动结合策略
      // 这里没有为每个窗口使用 timer 检查标记过期的窗口是否需要弹出
      // 后续元素进入会触发检查, 如果过期, 则弹出窗口.
      // 全局 timer 定期检查部分 window, 如果存在过期的, 则弹出窗口.
      if (now - window.localExpireTime >= this.lateness) {
        await this.evict()
      }
    }

    // 待统一/改进. 关联组件: MassElement, state.yield
    async evict() {
      // 弹出
      const window = this.windowGroup.evict()
      const result = window.stateStore.yield()
      // 可迭代对象分批次输出
      if (this.iterable && result[Symbol.iterator]) {
        for (const state of result) {
          await this.product({
            record: state,
            offsets: window.multiSrcTable,
            eventTime: new Date(window.windowTime),
            windowTime: new Date(window.windowTime),
            windowCreatedTime: new Date(window.created_at),
            span: window.span,
            lateness: window.lateness,
          })
        }
      } else {
        await this.product({
          record: result,
          offsets: window.multiSrcTable,
          eventTime: new Date(window.windowTime),
          windowTime: new Date(window.windowTime),
          windowCreatedTime: new Date(window.created_at),
          span: window.span,
          lateness: window.lateness,
        })
      }
    }

    /**
     * @desc 向前移动水平线到指定窗口时间
     * @param {Number} windowTime 
     */
    forwardWaterMarker(windowTime) {
      this.waterMarker = windowTime
    }

    async calc(elem) {
      // 计算元素所属窗口时间
      const windowTime = this.getWindowTime(elem.eventTime)
      // 选择一个窗口对象
      let window = this.selectWindow(windowTime)

      // 窗口/元素已经过期则退出
      if (window instanceof Error) {
        this.log.warn("%s 检测到元素过期. 窗口时间: %o, 事件时间: %o, waterMarker: %o", this.constructor.name, new Date(windowTime), new Date(elem.eventTime), new Date(this.waterMarker))
        this.discard();
        return
      }

      // 需要新建窗口
      if (!window) {
        window = this.createWindow(windowTime)
      }

      // 插入元素
      window.insert(elem)

      // 清理所有可驱逐窗口 (被动检查)
      await this.flushWindows()
    }

    // 算子关闭时清理定时器
    async cleanup() {
      clearTimeout(this.evictChecker)
      this.evictChecker = null
    }
  }

  operators.register("TumblingTimeWindowCalculator", TumblingTimeWindowCalculator)
}