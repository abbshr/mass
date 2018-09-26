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

  it("resetStore should work as expect", async () => {
    const task = new MassTask();
    await task.initStore();
    await task.setStore("x", "y");
    expect(await task.getStore("x")).toBe("y");
    await task.resetStore();
    expect(await task.getStore("x")).toBeUndefined();
  });

  it("resetStore should work as expect", async () => {
    const task = new MassTask();
    await task.initStore();
    await task.setStore("x", "y");
    expect(await task.getAllStore()).toBeInstanceOf(Map);
  });

  it("get/set should work as expect", () => {
    const task = new MassTask();
    task.set("m", "n");
    expect(task.get("m")).toBe("n");
    task.set({ "a": "b" });
    expect(task.get("a")).toBe("b");
    expect(task.get("m")).toBe("n");
  });
});