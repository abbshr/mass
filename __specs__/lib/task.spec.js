const MassTask = require("../../lib/task");

describe("lib/task.js", () => {
  it("executor should be configured if provided", () => {
    const cfg = {
      async executor() {},
    };

    const task = new MassTask(cfg);
    expect(task.executor).not.toBe(MassTask.prototype.executor);
    expect(task.executor).toBe(cfg.executor);
  });

  it("executor should be prototype method if provided", () => {
    const task = new MassTask();
    expect(task.executor).toBe(MassTask.prototype.executor);
  });

  it("task initial state should be PEND", () => {
    const task = new MassTask();
    expect(task.state).toBe(task.STATE.PEND);
  });

  it("task.scheduler should not exists when initialization", () => {
    const task = new MassTask();
    expect(task.scheduler).toBeUndefined();
  });

  it("getter should work as expected", () => {
    const task = new MassTask();
    expect(task.canceled).toBeFalsy();
    expect(task.running).toBeFalsy();
  });
});