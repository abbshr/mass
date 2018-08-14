const MassStreamTask = require("../../../lib/stream-task");
const MassTaskScheduler = require("../../../lib/scheduler");

describe("operators: stdio", () => {
  const { PassThrough } = require("stream");
  it("should work as expected", async done => {
    const scheduler = new MassTaskScheduler();

    const instream = new PassThrough();
    const outstream = new PassThrough();
    const buf = [];

    scheduler
    .spawnTask(MassStreamTask, {
      async streamProcessExecutor(env) {
        await env
          .from(env.operators.StdinSource.create(instream))
          .tap(elem => {
            expect(elem.record).toEqual(expect.stringMatching(/fst|sec/));
            expect(elem.record).not.toEqual(expect.stringContaining("quit"));
            buf.push(elem.record);
          })
          .to(env.operators.StdoutSink.create(outstream));

        const recvstr = outstream.read().toString("utf8");
        expect(recvstr).toEqual(expect.stringContaining(`"record": "${buf[0]}"`));
        expect(recvstr).toEqual(expect.stringContaining(`"record": "${buf[1]}"`));
        done();
      }
    })
    .sched();

    instream.write("fst");
    instream.write("sec");

    setImmediate(() => instream.write("quit"));
  });
});