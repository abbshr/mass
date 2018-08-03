const MassBus = require("../../lib/bus");

describe("lib/bus.js", () => {
  it("should use the default config if cfg is not provided", () => {
    const massBus = new MassBus();
    expect(massBus.cfg).toEqual(massBus.defaultConfig);
  });

  it("#send() should not throw", async () => {
    const massBus = new MassBus();
    await massBus.init();
    await expect(massBus.send()).resolves.toBeUndefined();
  });

  it("#send() should send the signal to channal", async () => {
    const massBus = new MassBus();
    await massBus.init();

    massBus.subscriber.on("message", (_, data) => {
      expect(JSON.parse(data)).toEqual([
        "notify",
        { data: "test-data" },
      ]);
    });

    await massBus.send("notify", { data: "test-data" });
  });

  it("#listen() should recv the signal emitted by #send()", async () => {
    const massBus = new MassBus();
    await massBus.init();

    massBus.listen((signal, data) => {
      expect(signal).toEqual("notify");
      expect(data).toEqual({ data: "test-data" });
    });

    await massBus.send("notify", { data: "test-data" });
  });
});