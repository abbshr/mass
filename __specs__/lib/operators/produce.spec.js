const MassStreamTask = require("../../../lib/stream-task");
const MassTaskScheduler = require("../../../lib/scheduler");

describe("operators: produce", () => {
  it("should work as expected", async () => {
    const scheduler = new MassTaskScheduler();

    scheduler
    .spawnTask(MassStreamTask, {
      async streamProcessExecutor(env) {

        await env
          .generate({ limit: 1, frequency: 100, emitter() { return 1; } })
          .produce({
            a(elem) { return elem.record + 1 },
            b(elem) { return elem.record + 2 },
          })
          .validate(elem => {
            expect(elem.record.a).toBe(2);
            expect(elem.record.b).toBe(3);
            return true;
          });
      }
    })
    .sched();
  });
});