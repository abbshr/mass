const MassStreamTask = require("../../lib/stream-task");
const Env = require("../../lib/env");
const MassTaskScheduler = require("../../lib/scheduler");
const MassBus = require("../../lib/bus");

describe("stream task", () => {
  it("task.at_every() (periodic) strategy should be disabled in stream task", () => {
    const streamTask = new MassStreamTask();
    expect(() => streamTask.at_every()).toThrow();
  });

  it("task.env should be an instance of Env", done => {
    const sched = new MassTaskScheduler({});
    const streamTask = sched.spawnTask(MassStreamTask, {
      taskId: "test-stream-task",
      async streamProcessExecutor(env, bus) {
        expect(env).toBeInstanceOf(Env);
        expect(bus).toBeInstanceOf(MassBus);
        done();
      },
    });

    streamTask.grab();
    sched.bootstrap();
  });
});