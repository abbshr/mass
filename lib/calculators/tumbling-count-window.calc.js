const Window = require("../components/window")
const WindowGroup = require("../components/window-group")
const moment = require("moment")

module.exports = operators => {
  class TumblingCountWindowCalculator extends operators.WindowCalculator {
    /**
     * @desc 无重叠计数窗口算子
     * @param {Env} env 
     * @param {Object} options 窗口配置
     * @param {Number} options.capacity 窗口容量
     * @param {String} options.idleRetention 窗口的空闲保留时间, 当窗口在规定时间内没有元素进入时, 即便没有达到容量上线, 算子也会将窗口输出. 通过 ![ISO8601 Duration](https://en.wikipedia.org/wiki/ISO_8601#Durations) 表示法定义
     * @param {Boolean} options.iterable 窗口输出的数据如果是可迭代的, 是否分批次输出
     * 
     * 计数窗口和时间窗口有个明显差别, 计数窗口里的元素没有顺序(时序), 因此也没有延迟之类的概念
     * 
     * 在无重叠窗口里, 数量窗口的窗口组中只需要维护唯一一个窗口:
     * - 达到容量上限 -> 窗口输出
     * - 超过最大空闲时间 -> 窗口输出
     * 
     * 计数窗口和时间窗口采用了类似的策略, 定期检查窗口的空闲时间是否超过最大限制. 防止长时间的空闲导致窗口不再输出数据.
     */
    constructor(env, { capacity, idleRetention, iterable }) {
      super(env)

      this.iterable = !!iterable
      this.capacity = capacity
      this.idleRetention = moment.duration(idleRetention).asMilliseconds()
      this.windowGroup = new WindowGroup()
      this.evictCheckFrequency = 100
      this.runEvictChecker()
    }

    runEvictChecker() {
      this.evictChecker = setTimeout(async () => {
        await this.checkWindowEvictable()
        this.runEvictChecker()
      }, this.evictCheckFrequency)
    }

    /**
     * @desc 根据空闲保留时间 idleRetention 检查窗口是否可驱逐
     */
    async checkWindowEvictable() {
      if (this.windowGroup.empty) {
        return
      }

      await this.evictIdleWindow()
    }

    /**
     * @desc 根据计数规则选择窗口.
     * 如果窗口组的头窗口计数达到容量上限, 返回 undefined.
     * 否则返回窗口.
     * @return {Undefined | Window}
     */
    selectWindow() {
      if (this.windowGroup.empty) {
        return
      } else if (this.windowGroup.head.insertedCount >= this.capacity) {
        return
      } else {
        return this.windowGroup.head
      }
    }

    createWindow() {
      const window = new Window(
        null, // 没有窗口时间
        this.capacity,
        null, // 没有 lateness
        this.createStateStore()
      )
      return this.windowGroup.add(window)
    }

    /**
     * @desc 插入元素后执行此方法进行检查&驱逐
     */
    async flushWindows() {
      if (!await this.evictFullWindow()) {
        await this.evictIdleWindow()
      }
    }

    /**
     * @desc 驱逐达到容量上限的窗口
     * @return {True | Undefined} 是否驱逐了窗口
     */
    async evictFullWindow() {
      if (this.windowGroup.head.insertedCount >= this.capacity) {
        await this.evict()
        return true
      }
    }

    /**
     * @desc 驱逐长时间空闲的窗口
     * @return {True | Undefined} 是否驱逐了窗口
     */
    async evictIdleWindow() {
      if (new Date() - this.windowGroup.head.lastInsertedTime > this.idleRetention) {
        await this.evict()
        return true
      }
    }

    async evict() {
      const window = this.windowGroup.evict()
      const result = window.stateStore.yield()

      // 可迭代对象分批次输出
      if (this.iterable && result[Symbol.iterator]) {
        for (const state of result) {
          await this.product({
            record: state,
            offsets: window.multiSrcTable,
            windowCreatedTime: new Date(window.created_at),
            capacity: this.capacity,
            idleRetention: this.idleRetention,
          })
        }
      } else {
        await this.product({
          record: result,
          offsets: window.multiSrcTable,
          windowCreatedTime: new Date(window.created_at),
          capacity: this.capacity,
          idleRetention: this.idleRetention,
        })
      }
    }

    async calc(elem) {
      let window = this.selectWindow(elem)

      if (!window) {
        window = this.createWindow()
      }

      window.insert(elem)

      await this.flushWindows()
    }
  }

  operators.register("TumblingCountWindowCalculator", TumblingCountWindowCalculator)
}