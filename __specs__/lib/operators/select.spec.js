const MassStreamTask = require("../../../lib/stream-task");
const MassTaskScheduler = require("../../../lib/scheduler");

describe("operators: select", () => {
  it("should work as expected", async () => {
    const scheduler = new MassTaskScheduler();

    scheduler
    .spawnTask(MassStreamTask, {
      async streamProcessExecutor(env) {
        let i = 0;

        await env
          .generate({ limit: 4, frequency: 100, emitter() { return i++; } })
          .select(elem => elem.record % 2)
          .validate(elem => {
            expect(elem.record % 2).not.toBe(0);
            return true;
          });
      }
    })
    .sched();
  });
});