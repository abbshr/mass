// const { Window, Session } = require("../components/window");
// const WindowsGroup = require("../components/windows-grp");
// const { ElementGroup } = require("../components/data");

// windowBy("time", { span: "15minutes", patt: "0 */15 * * * *", use_event_time: "arrival_time" })
module.exports = operators => {
  class WindowCalculator extends operators.Calculator {
    constructor(env, opts) {
      super(env);
  
      this.span = moment.duration(opts.span);
      this.baseTime = opts.baseTime || new Date();
      this.useEventTime = opts.use_event_time;
      this.useSkipList = false;
  
      this.windowsGroup = new WindowsGroup({ useSkipList: this.useSkipList });
    }
  
    getElemTime(elem) {
      return this.useEventTime ? chunk[this.useEventTime] : Date.now();
    }
  
    setElemTrigger(Trigger) {
      this.ElemTrigger = Trigger;
    }
  
    setHandle(handler) {
      this.handler = handler;
    }
  
    expiredWith(timeseriesObject) {
      this.windowsGroup.shift();
      // TODO: generate elementGroup with the same window time
      this.product(timeseriesObject);
    }
  
    static create(env, type, opts) {
      switch (type) {
        case "time": {
          if (opts.span) {
            return new SlidingWindowCalculator(env, opts);
          }
          return new SessionWindowCalculator(env, opts);
        }
        case "count": {
          
        };
      }
    }
  }
  
  // class InternalClockDrivenWindowCalculator {}
  // class ExternalClockDrivenWindowCalculator {}
  
  // 滑动窗口: 根据系统时钟决定窗口创建时间
  class SlidingWindowCalculator extends WindowCalculator {
    constructor(env, opts) {
      super(env, opts);
      this.patt = opts.patt;
      this.movepatt = cron.parseExpression(this.patt, { currentDate: this.baseTime });
    }
  
    static create(args) {
      const slidingWindow = new this(args);
      slidingWindow.checker();
      return slidingWindow;
    }
  
    checker(i = 0) {
      const now = Date.now();
      const timeout = this.getNextTimeout(now);
      const duration = Math.max(timeout - now, 0);
  
      this.windowWatcher = setTimeout(() => {
        this.createWindow(timeout, this.span);
        this.checker(i + 1);
      }, duration);
  
      // console.debug("CHECKING WINDOW:", {
      //   i,
      //   now,
      //   timeout,
      //   duration,
      //   retentionWindowsSize: this.windowsGroup.size,
      //   retentionWindows: this.windowsGroup.travel,
      // });
    }
  
    getNextTimeout(baseTime) {
      let nextTimeout = this.movepatt.next();
      return nextTimeout;
    }
  
    createWindow(start, span) {
      const window = new Window(start, span, this.ElemTrigger);
      window.runTimer();
  
      window.once("expired", timeseriesObject => {
  
        // console.debug("WINDOW EXPIRED:", {
        //   withTimeSeries: timeseriesObject,
        //   expiredWindow: window
        // });
  
        if (window.trigger) {
          window.trigger.onWindowExpired();
        } else {
          // TODO: generate elementGroup with the same window time
          this.expiredWith(timeseriesObject);
        }
      });
  
      window.on("insert", (elem, time) => {
        if (window.trigger) {
          window.trigger.onInsertElement(elem, time);
        } else {
          window.defaultInsertBehavior(elem, time);
        }
      });
  
      this.windowsGroup.add(start, window);
  
      // console.debug("CREATED WINDOW:", {
      //   newWindow: { start, span },
      //   retentionWindowsSize: this.windowsGroup.size,
      //   retentionWindows: this.windowsGroup.travel,
      // });
  
      return window;
    }
  
    async calc(elem) {
      // console.debug("INSERT ELEM INTO WINDOWS:", { elem });
  
      let time = this.getElemTime(elem);
      const windows = this.windowsGroup.range(time - this.span, time);
      for (let window of windows) {
        // if (this.handler) {
        //   this.handler.process(window, elem);
        // } else {
        //   window.insert(elem, time);
        // }
        window.insert(elem, time);
      }
  
      // console.debug("AFTER INSERTING WINDOWS STATUS:", {
      //   retentionWindowsSize: this.windowsGroup.size,
      //   retentionWindows: this.windowsGroup,
      // });
    }
  }
  
  // 会话窗口: 根据元素时钟决定窗口创建时间与持续时间
  class SessionWindowCalculator extends WindowCalculator {
    constructor(env, opts) {
      super(env, opts);
      this.patt = opts.patt;
      this.movepatt = cron.parseExpression(this.patt, { currentDate: this.baseTime });
    }
  
    getCurrSession(time) {
      return cron.parseExpression(this.patt, { currentDate: time }).next().prev();
    }
  
    getNextSession(time) {
      return cron.parseExpression(this.patt, { currentDate: time }).next();
    }
  
    selectOrCreateSessionWindow(time) {
      const currentSession = this.getCurrSession(time);
      if (this.windowsGroup.empty) {
        return this.createWindow(currentSession, this.span);
      }
  
      const latestSessionWindow = this.windowsGroup.last;
  
      if (time >= latestSessionWindow.start) {
        if (time < latestSessionWindow.end) {
          // current session
          return latestSessionWindow;
        } else {
          const prevSessionWindows = this.windowsGroup.prevSubSet;
          for (let window of prevSessionWindows) {
            window.markExpired();
          }
  
          let newSession = latestSessionWindow.start;
          let newSessionWindow = latestSessionWindow;
          do {
            const oldSession = newSession;
            const oldSessionWindow = newSessionWindow;
            oldSessionWindow.markExpired();
            newSession = this.getNextSession(newSession);
            newSessionWindow = this.createWindow(newSession, this.span);
          } while (newSession < time)
  
          // next (n) sessions
          return newSessionWindow;
        }
      } else {
        // find session window
        this.windowsGroup.find(currentSession);
      }
    }
  
    createWindow(start, span) {
      let sessionWindow = new Session(start, span, new this.ElemTrigger());
  
      sessionWindow.once("expired", timeseriesObject => {
        if (sessionWindow.trigger) {
          sessionWindow.trigger.onWindowExpired();
        } else {
          // TODO: generate elementGroup with the same window time
          this.expiredWith(timeseriesObject);
        }
      });
  
      sessionWindow.on("insert", (elem, time) => {
        if (sessionWindow.trigger) {
          sessionWindow.trigger.onInsertElement(elem, time);
        } else {
          sessionWindow.defaultInsertBehavior(elem, time);
        }
      });
  
      this.windowsGroup.add(start, sessionWindow);
  
      return sessionWindow;
    }
  
    async calc(elem) {
      let time = this.getElemTime(elem);
      const window = this.selectOrCreateSessionWindow(time);
  
      if (window) {
        // if (this.handler) {
        //   this.handler.process(window, elem);
        // } else {
        //   window.insert(elem, time);
        // }
        window.insert(elem, time);
      } else {
        // ignore elem
      }
    }
  }
  
  operators.register("WindowCalculator", WindowCalculator);
  operators.register("SlidingWindowCalculator", SlidingWindowCalculator);
  operators.register("SessionWindowCalculator", SessionWindowCalculator);  
};