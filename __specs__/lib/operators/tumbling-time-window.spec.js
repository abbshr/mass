const MassStreamTask = require("../../../lib/stream-task");
const MassTaskScheduler = require("../../../lib/scheduler");

describe("operators: tumbling time window", () => {
  it("should work as expected", async () => {
    const scheduler = new MassTaskScheduler();

    scheduler
    .spawnTask(MassStreamTask, {
      async streamProcessExecutor(env) {
        const epoch = (new Date()).setHours(0, 0, 0, 0)
        const dataset = [
          {
            eventTime: new Date(epoch),
            MONITOR_TYPE: "appCrash",
            MONITOR_VERSION: 1,
            WAX_APP_NAME: "test",
            WAX_APP_VERSION: "test",
            WAX_SDK_NAME: "test-1",
            WAX_SDK_VERSION: "test",
            SYSTEM_MODEL: "iOS",
            PAGE_NAME: "test",
            COST_TIME: 5,
            CRASH_TYPE: "native"
          },
          {
            eventTime: new Date(epoch + 6000),
            MONITOR_TYPE: "appCrash",
            MONITOR_VERSION: 1,
            WAX_APP_NAME: "test",
            WAX_APP_VERSION: "test",
            WAX_SDK_NAME: "test",
            WAX_SDK_VERSION: "test",
            SYSTEM_MODEL: "iOS",
            PAGE_NAME: "test",
            COST_TIME: 10,
            CRASH_TYPE: "native"
          },
          {
            eventTime: new Date(epoch + 13 * 60 * 1000),
            MONITOR_TYPE: "appCrash",
            MONITOR_VERSION: 1,
            COST_TIME: 100,
            WAX_APP_NAME: "test-1",
            WAX_APP_VERSION: "test",
            WAX_SDK_NAME: "test",
            WAX_SDK_VERSION: "test",
            SYSTEM_MODEL: "iOS",
            PAGE_NAME: "test",
            COST_TIME: 20,
            CRASH_TYPE: "native"
          },
          {
            eventTime: new Date(epoch + 16 * 60 * 1000),
            MONITOR_TYPE: "appCrash",
            MONITOR_VERSION: 1,
            COST_TIME: 75,
            WAX_APP_NAME: "test",
            WAX_APP_VERSION: "test",
            WAX_SDK_NAME: "test",
            WAX_SDK_VERSION: "test",
            SYSTEM_MODEL: "iOS",
            PAGE_NAME: "test",
            COST_TIME: 30,
            CRASH_TYPE: "native"
          },
        ]

        const timewindow = env.operators.TumblingTimeWindowCalculator.create({
          span: "PT15M",
        })
        .groupBy(elem => elem.record.WAX_SDK_NAME)
        .record({
          costTime(curr, elem) {
            return curr + elem.record.COST_TIME;
          },
        }, {
          costTime: 0
        });

        await env
        .generate({
          limit: 4,
          frequency: 100,
          emitter() {
            return dataset.shift();
          },
        })
        .window(timewindow)
        .validate(elem => {
          expect([5, 30]).toContain(elem.record.state.get("costTime"));
          return true;
        })
        // .shard(elem => elem.record.WAX_APP_NAME)
        // .pipeline(shard => {
        //   shard
        //   .shard(elem => elem.record)
        //   .pipeline(shard => {
        //     shard.to(stdout)
        //   })
        // })
      }
    })
    .sched();
  });
});