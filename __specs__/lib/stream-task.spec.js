const MassStreamTask = require("../../lib/stream-task");
const Env = require("../../lib/env");
const MassTaskScheduler = require("../../lib/scheduler");
const MassBus = require("../../lib/components/bus");
const { EventEmitter } = require("events");
const pEvent = require("p-event");

describe("stream task", () => {
  it("task.at_every() (periodic) strategy should be disabled in stream task", () => {
    const streamTask = new MassStreamTask();
    expect(() => streamTask.at_every()).toThrow();
  });

  it("task.env should be an instance of Env", done => {
    const sched = new MassTaskScheduler({});
    const streamTask = sched.spawnTask(MassStreamTask, {
      taskId: "test-stream-task",
      async streamProcessExecutor(env, input, bus) {
        expect(env).toBeInstanceOf(Env);
        expect(env).toBeInstanceOf(Promise);
        expect(input).toBe("data");
        expect(bus).toBeInstanceOf(MassBus);
        done();
      },
    });

    streamTask.grab("data");
  });

  it("a pipeline (generate -> tap -> validate) should work as expected", done => {
    const sched = new MassTaskScheduler({});
    sched.spawnTask(MassStreamTask, {
      async streamProcessExecutor(env, input, bus) {
        const pipeline =
          env
          .generate({ frequency: 100, limit: 20 })
          .tap(elem => expect(elem).toEqual(expect.objectContaining({ record: 1 })))
          .validate(elem => {
            expect(elem).toEqual(expect.objectContaining({ record: 1 }));
            return elem.record === 1;
          });
        await expect(pipeline).resolves.not.toBeInstanceOf(Error);
        done();
      }
    }).sched();
  });

  it("a pipeline (generate -> tap -> validate) should work as expected", async done => {
    const sched = new MassTaskScheduler({});
    sched.spawnTask(MassStreamTask, {
      async streamProcessExecutor(env, input, bus) {
        const pipeline =
          env
          .generate({ frequency: 100, limit: 20, emitter() { return 2; } })
          .tap(elem => expect(elem).toEqual(expect.objectContaining({ record: 2 })))
          .validate(elem => {
            expect(elem).toEqual(expect.objectContaining({ record: 2 }));
            return elem.record === 1;
          });
        await expect(pipeline).rejects.toBeInstanceOf(Error);
        done();
      }
    }).sched();
  });

  // it("ResourceManager.prototype.free() should be called in the same event loop tick and ResourceManager.prototype.waitExtremityEnvsRelease() should not be called if task.streamProcessExecutor() throws", async () => {
  //   const sched = new MassTaskScheduler({});
  //   const streamTask = sched.spawnTask(MassStreamTask, {
  //     taskId: "test-stream-task",
  //     async streamProcessExecutor(env, bus) {
  //       expect(env).toBeInstanceOf(Env);
  //       expect(env).toBeInstanceOf(Promise);
  //       expect(bus).toBeInstanceOf(MassBus);
  //       done();
  //     },
  //   });

  //   streamTask.grab();
  //   sched.bootstrap();
  // });

  // it("stream task should wait for all operators to exit to complete the task", async () => {

  // });

  it("if there are at least one end-op still working fine, stream task won't exit even if some ops exit", async () => {
    const sched = new MassTaskScheduler({});
    let pipeline_1, pipeline_2;
    const em = new EventEmitter();
    const streamTask = sched.spawnTask(MassStreamTask, {
      taskId: "test-stream-task",
      async streamProcessExecutor(env, input, bus) {
        pipeline_1 = env
          .from(env.operators.GeneratorSource.create({ limit: 1, frequency: 100 }))
          .compute(env.operators.TapCalculator.create(elem => console.log("PIPELINE 1 GOT:", elem)))
          .to(env.operators.ValidateSink.create(elem => elem.record === 1));

        pipeline_2 = env
          .generate({ limit: 1, frequency: 2000 })
          .tap(elem => console.log("PIPELINE 2 GOT:", elem))
          .validate(elem => elem.record === 1);

        em.emit("ok");
      },
    });

    streamTask.grab();
    await pEvent(em, "ok");

    await pipeline_1;
    expect(pipeline_1.success).toBeTruthy();
    expect(pipeline_1.exited).toBeTruthy();
    expect(pipeline_2.exited).toBeFalsy();
    expect(streamTask.state).toBe(streamTask.STATE.RUN);

    await pipeline_2;
    expect(pipeline_2.success).toBeTruthy();
    expect(pipeline_2.exited).toBeTruthy();

    await sched.onIdle();
    expect(streamTask.state).toBe(streamTask.STATE.FINISH);
  });
});