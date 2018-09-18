const MassStreamTask = require("../../../lib/stream-task");
const MassTaskScheduler = require("../../../lib/scheduler");

describe("operators: drop", () => {
  it("should work as expected", async () => {
    const scheduler = new MassTaskScheduler();

    scheduler
    .spawnTask(MassStreamTask, {
      async streamProcessExecutor(env) {
        let i = 0;

        await env
          .generate({ limit: 4, frequency: 100, emitter() { return i++; } })
          .drop(elem => elem.record % 2)
          .validate(elem => {
            expect(elem.record % 2).toBe(0);
            return true;
          });
      }
    })
    .sched();
  });
});