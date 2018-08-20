const MassBus = require("../../lib/components/bus");
const config = require("../../lib/config");

describe("lib/bus.js", () => {
  it("should use the config provided by the lib/config", () => {
    const massBus = new MassBus();
    expect(massBus.cfg).toEqual(config.busConfig);
  });

  it("#send() should not throw", async () => {
    const massBus = new MassBus();
    const tmp = massBus.publisher.publish;
    massBus.publisher.publish = async () => {
      throw new Error();
    };
    await expect(massBus.send()).resolves.toBeInstanceOf(Error);
    massBus.publisher.publish = tmp;
  });

  it("#send() should send the signal to channal", done => {
    const massBus = new MassBus();

    massBus.subscriber.once("message", (_, data) => {
      expect(JSON.parse(data)).toEqual([
        "notify",
        { data: "test-data" },
      ]);
      done();
    });

    massBus.send("notify", { data: "test-data" });
  });

  it("#listen() should recv the signal emitted by #send()", done => {
    const massBus = new MassBus();

    massBus.listen((signal, data) => {
      expect(signal).toEqual("notify");
      expect(data).toEqual({ data: "test-data" });
      done();
    });

    massBus.send("notify", { data: "test-data" });
  });

  it("#listen() should not throw, handler fn should not be called and should re-listen if destructured failed", async () => {
    const massBus = new MassBus();
    const tmp = massBus.destructured;
    massBus.destructured = () => {
      throw new Error();
    };
    const mockFn = jest.fn();

    massBus.listen(mockFn);

    await massBus.send("notify", { data: "test-data" });
    expect(mockFn).toHaveBeenCalledTimes(0);

    massBus.destructured = tmp;
    await massBus.send("notify", { data: "test-data" });

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn.mock.calls[0][0]).toEqual("notify");
    expect(mockFn.mock.calls[0][1]).toEqual({ data: "test-data" });

    await massBus.send("notify-1", { data: "test-data-1" });
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("#listen() should not throw, handler fn should not be called and should re-listen if destructured failed", async () => {
    const massBus = new MassBus();
    const tmp = massBus.send;
    massBus.send = async function (signal, payload) {
      try {
        return await this.publisher.publish("test-chan", this.sequelize(signal, payload));
      } catch (err) {
        console.log(this.constructor.name, "信号发送失败:", { signal, payload , chan: this.cfg.chan }, err);
        return err;
      }
    };
    const mockFn = jest.fn();

    massBus.listen(mockFn);

    await massBus.send("notify", { data: "test-data" });
    expect(mockFn).toHaveBeenCalledTimes(0);
    await massBus.send("notify", { data: "test-data" });
    expect(mockFn).toHaveBeenCalledTimes(0);
    massBus.send = tmp;
  });
});