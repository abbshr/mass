const MassStreamTask = require("../../../lib/stream-task");
const MassTaskScheduler = require("../../../lib/scheduler");
const { Calculator, Sink } = require("../../../lib/operators");
const { StateAggregator } = require("../../../lib/states");
const { stream: { Env } } = require("../../..")();

class MyCalculator extends Calculator {
  constructor(env) {
    super(env);
    this.state = 0;
    this.result = null;
  }

  async calc(elem) {
    if (this.state === 0) {
      this.state = 1;
      this.result = this.createStateStore();
    }

    if (elem.record === "ok") {
      this.state = 0;
      this.product({ record: await this.result.yield() });
    } else {
      await this.result.collect(elem);
    }
  }

  async done() {
    console.log("mycalc done");
  }
}

class MySumStateAggregator extends StateAggregator {
  constructor(stateGenerator) {
    super(stateGenerator, null);
    this._result = 0;
  }

  async collect(elem) {
    if (!isNaN(+elem.record)) {
      this.stash += +elem.record;
    }
  }
}

class TestSink extends Sink {
  async produce(elem) {
    this.produce = () => null
    throw new Error("test")
  }
}

describe("stateful streaming task", () => {
  it("calc-state should work as expected", async () => {
    const { PassThrough } = require("stream");
    const instream = new PassThrough();
    const scheduler = new MassTaskScheduler();
    scheduler
    .spawnTask(MassStreamTask, {
      async streamProcessExecutor(env) {
        env
        .from(env.operators.StdinSource.create(instream))
        .compute(MyCalculator.create())
          .use(MySumStateAggregator)
        .validate(elem => {
          expect(elem.record % 10).toEqual(0);
          return elem.record % 10 === 0;
        });
      }
    }).sched();

    instream.write("1");
    instream.write("2");
    instream.write("3");
    instream.write("4");
    instream.write("ok");

    instream.write("2");
    instream.write("4");
    instream.write("6");
    instream.write("8");
    instream.write("ok");

    setImmediate(() => instream.write("quit"));

    await scheduler.onIdle();
  });

  it("sink#discard() call should not throw", async () => {
    const env = new Env(null);
    const { PassThrough } = require("stream");
    const instream = new PassThrough();

    instream.write("1");
    setImmediate(() => instream.write("quit"));

    await expect(env
      .from(env.operators.StdinSource.create(instream))
      .to(TestSink.create())).resolves.toBeNull();
  });
});