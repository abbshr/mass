const MassStreamTask = require("../../../lib/stream-task");
const MassTaskScheduler = require("../../../lib/scheduler");

describe("operators: mutate", () => {
  it("should work as expected", async () => {
    const scheduler = new MassTaskScheduler();

    scheduler
    .spawnTask(MassStreamTask, {
      async streamProcessExecutor(env) {

        await env
          .generate({ limit: 1, frequency: 100, emitter() { return 1; } })
          .tap(elem => expect(elem.modifiedTime).toBeUndefined())
          .mutate(elem => elem.x = 1)
          .validate(elem => {
            expect(elem.modifiedTime).toBeDefined();
            expect(elem.x).toBe(1);
            return true;
          });
      }
    })
    .sched();
  });
});