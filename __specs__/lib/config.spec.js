const config = require("../../lib/config");

describe("config", () => {
  it("should be ok", () => {
    expect(config.commonConfig).toBeDefined();
    expect(config.mutexConfig).toBeDefined();
    expect(config.taskStoreConfig).toBeDefined();
    expect(config.busConfig).toBeDefined();
    expect(config.syslogConfig).toBeDefined();
    expect(config.applogConfig).toBeDefined();
    expect(config.offsetManagerConfig).toBeDefined();
  });
  it("merge should be ok", () => {
    config.merge({ commonConfig: { commonPrefix: "test" } });
    expect(config.commonConfig.commonPrefix).toBe("test");
  });
  it("setConfig should work as expected", () => {
    expect(() => config.setConfig("non-existed", {})).toThrow();
    expect(config.setConfig("syslogConfig", {})).toBeDefined();
  });
})