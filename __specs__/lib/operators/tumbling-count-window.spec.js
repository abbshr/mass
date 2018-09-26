const { stream: { Env } } = require("../../..")();

describe("operators: tumbling count window", () => {
  it("should work as expected", async () => {
    const env = new Env(null);
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
        eventTime: new Date(epoch - 16 * 60 * 1000),
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

    const countwindow = env.operators.TumblingCountWindowCalculator.create({
      capacity: 3,
    })
    .reduce(data => data.record);

    await env
    .generate({
      limit: 5,
      frequency: 100,
      emitter() {
        return dataset.shift();
      },
    })
    .window(countwindow)
    .validate(elem => {
      expect(elem.record.MONITOR_TYPE).toBe("appCrash");
      return true;
    })
  });
});