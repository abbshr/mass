const MassTaskScheduler = require("../../lib/scheduler");
const MassTask = require("../../lib/task");

describe("lib/scheduler.js", () => {
  it("should not throws if cfg inst provide", () => {
    let sched = null;
    expect(() => sched = new MassTaskScheduler()).not.toThrow();
    expect(sched.concurrency).toBe(1);
    expect(sched.maxRetryTimes).toBe(5);
  });

  it("default task priority is 0", () => {
    const sched = new MassTaskScheduler({});
    expect(sched.NICE).toBe(0);
  });

  it("#spawnTask(TaskClass, cfg) should return an instance of TaskClass with cfg", () => {
    const sched = new MassTaskScheduler({});
    const task = sched.spawnTask(MassTask, { taskId: "test-id" });
    expect(task).toBeInstanceOf(MassTask);
    expect(task.scheduler).toBe(sched);
    expect(sched.taskRegistry.has("task-id")).toBeFalsy();
  });

  it("task.on() (signal) strategy should grab the privilege to execute the task executor when received the signal", async () => {
    const sched = new MassTaskScheduler({});
    const task = sched.spawnTask(MassTask, {
      taskId: "task"
    });

    sched.preemptiveSchedule = jest.fn();

    task.on("test-sig");
    await sched.bus.send("test-sig", { data: "test-data" });

    expect(sched.preemptiveSchedule).toBeCalled();
    expect(sched.preemptiveSchedule).toHaveBeenCalledTimes(1);
  });

  it("task.at() (future) strategy should grab the privilege to execute the task executor at the given moment", () => {
    jest.useFakeTimers();
    const OriginalDate = Date;
    Date = class {
      constructor () {
        const date = new OriginalDate();
        date.setHours(0, 0, 0, 0);
        return date;
      }
    };

    const sched = new MassTaskScheduler({});
    sched.preemptiveSchedule = jest.fn();

    const task = sched.spawnTask(MassTask, {});
    expect(task.canceled).toBeFalsy();
    task.at("0 0 * * * *");

    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 3600000);

    expect(sched.preemptiveSchedule).not.toBeCalled();
    jest.runAllTimers();

    expect(sched.preemptiveSchedule).toBeCalled();
    expect(sched.preemptiveSchedule).toHaveBeenCalledTimes(1);

    Date = OriginalDate;
  });

  it("task.at_every() (periodic) strategy should grab the privilege to execute the task executor periodicly match the given pattern", () => {
    jest.useFakeTimers();
    const OriginalDate = Date;
    Date = class {
      constructor () {
        const date = new OriginalDate();
        date.setHours(0, 0, 0, 0);
        return date;
      }
    };

    const sched = new MassTaskScheduler({});
    sched.preemptiveSchedule = jest.fn();

    const task = sched.spawnTask(MassTask, {});
    expect(task.canceled).toBeFalsy();
    task.at_every("0 0 * * * *");

    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 3600000);

    expect(sched.preemptiveSchedule).not.toBeCalled();
    jest.runOnlyPendingTimers();

    expect(sched.preemptiveSchedule).toBeCalled();
    expect(sched.preemptiveSchedule).toHaveBeenCalledTimes(1);

    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 3600000);

    Date = OriginalDate;
  });

  it("task.sched() (queued) strategy should add the task to queue tail", async () => {
    const sched = new MassTaskScheduler({});
    const taskBefore = sched.spawnTask(MassTask, {
      taskId: "before",
      async executor() {
        return new Promise(resolve => setTimeout(resolve, 1000000));
      }
    });
    const task = sched.spawnTask(MassTask, {
      taskId: "after"
    });

    expect(taskBefore.state).toBe(task.STATE.PEND);
    expect(task.state).toBe(task.STATE.PEND);
    taskBefore.sched();
    task.sched();
    expect(taskBefore.state).toBe(task.STATE.READY);
    expect(task.state).toBe(task.STATE.READY);

    await new Promise(resolve => {
      setImmediate(() => {
        expect(taskBefore.state).toBe(task.STATE.RUN);
        expect(task.state).toBe(task.STATE.READY);
        resolve(null);
      });
    });
  });

  it("task.grab() (immediate) strategy should grab the privilege immediately", async () => {
    const sched = new MassTaskScheduler({});
    const taskBefore = sched.spawnTask(MassTask, {
      taskId: "before",
      async executor() {
        return new Promise(resolve => setTimeout(resolve, 1000000));
      }
    });
    const task = sched.spawnTask(MassTask, {
      taskId: "after",
      async executor() {
        return new Promise(resolve => setTimeout(resolve, 1000000));
      }
    });

    sched.pause();
    expect(taskBefore.state).toBe(task.STATE.PEND);
    expect(task.state).toBe(task.STATE.PEND);
    taskBefore.sched();
    task.grab();
    expect(taskBefore.state).toBe(task.STATE.READY);
    expect(task.state).toBe(task.STATE.READY);

    sched.resume();

    await new Promise(resolve => {
      setImmediate(() => {
        expect(task.state).toBe(task.STATE.RUN);
        expect(taskBefore.state).toBe(task.STATE.READY);
        resolve(null);
      });
    });
  });

  it("multi task with task.grab() strategy should be scheduled in-order", async () => {
    const sched = new MassTaskScheduler({});
    const taskBefore = sched.spawnTask(MassTask, {
      taskId: "before",
      async executor() {
        return new Promise(resolve => setTimeout(resolve, 1000000));
      }
    });
    const task = sched.spawnTask(MassTask, {
      taskId: "after",
      async executor() {
        return new Promise(resolve => setTimeout(resolve, 1000000));
      }
    });

    expect(taskBefore.state).toBe(task.STATE.PEND);
    expect(task.state).toBe(task.STATE.PEND);
    taskBefore.grab();
    task.grab();
    expect(taskBefore.state).toBe(task.STATE.READY);
    expect(task.state).toBe(task.STATE.READY);

    await new Promise(resolve => {
      setImmediate(() => {
        expect(taskBefore.state).toBe(task.STATE.RUN);
        expect(task.state).toBe(task.STATE.READY);
        resolve(null);
      });
    });
  });

  it("sched.cancel(id) should cancel the next executing of the task with the given id", async () => {
    const sched = new MassTaskScheduler({});
    const task = sched.spawnTask(MassTask, {
      taskId: "test",
      async executor() {
        return new Promise(resolve => setTimeout(resolve, 1000000));
      }
    });

    expect(task.state).toBe(task.STATE.PEND);
    task.grab();
    expect(task.state).toBe(task.STATE.READY);

    await new Promise(resolve => {
      setImmediate(() => {
        expect(task.state).toBe(task.STATE.RUN);
        sched.cancel(task.taskId);
        expect(task.state).toBe(task.STATE.CANCEL);
        resolve(null);
      });
    });
  });

  it("default fault tolerate strategy should re-schedule the task when it not exceed the max retry attemp", async () => {
    const sched = new MassTaskScheduler({});

    const store = { failed: 0 };
    const task = sched.spawnTask(MassTask, {
      taskId: "test",
      taskName: "Test failed task",
      async executor(input, proceed) {
        if (store.failed > 3) {
          return this.__proto__.executor(input, proceed);
        } else {
          store.failed++;
          throw new Error("mission failed");
        }
      }
    });

    task.sched();
    await sched.onIdle();
    expect(store.failed).toBe(4);
    expect(task.state).toBe(task.STATE.FINISH);
  });

  it("default fault tolerate strategy will no longer re-scheduler the task and add it to dead-letter queue when it exceed the max retry attemp", async () => {
    const sched = new MassTaskScheduler({});

    const store = { failed: 0 };
    const task = sched.spawnTask(MassTask, {
      taskId: "test",
      taskName: "Test failed task",
      async executor() {
        if (store.failed > 10) {
          return;
        } else {
          store.failed++;
          throw new Error("mission failed");
        }
      }
    });

    task.sched();
    await sched.onIdle();
    expect(store.failed).toBe(6);
    expect(task.state).toBe(task.STATE.DEAD);
  });

  it("task.addChildTask(task) should add the sub-task with the whole output to schedule using the (queued) strategy before itself change to finished or failure", done => {
    const sched = new MassTaskScheduler({});

    const subTask = sched.spawnTask(MassTask, {
      taskId: "sub-task",
      taskName: "Test sub task",
      async executor(input, proceed) {
        expect(input).toEqual({ data: "from test task" });
        proceed(input);
        done();
      }
    });
    const task = sched.spawnTask(MassTask, {
      taskId: "test",
      taskName: "Test task",
      async executor(input, proceed) {
        proceed({ data: "from test task" });
      }
    });

    task.addChildTask(subTask);

    task.sched();
  });

  it("task.mapChildTasks(task) should add the sub-tasks with each element in the output to schedule using the (queued) strategy before itself change to finished or failure", done => {
    const sched = new MassTaskScheduler({});

    const subTask = sched.spawnTask(MassTask, {
      taskId: "sub-task",
      taskName: "Test sub task",
      async executor(input, proceed) {
        expect([{ a: 1 }, { b: 2 }, { c: 3 }]).toContainEqual(input);
        proceed(input);
        done()
      }
    });
    const task = sched.spawnTask(MassTask, {
      taskId: "test",
      taskName: "Test task",
      async executor(input, proceed) {
        proceed([{ a: 1 }, { b: 2 }, { c: 3 }]);
      }
    });

    task.mapChildTasks(subTask);

    task.sched();
  });

  it("mutex job should work as expected", done => {
    const sched = new MassTaskScheduler();
    sched
    .spawnTask(MassTask, {
      async executor(input, proceed, bus) {
        expect(input).toBe("get executed privilege");
        done();
      }
    })
    .mutex("mutex")
    .sched("get executed privilege");
  });
});