(async () => {
  const Mass = await require("..")({ task_store: { cfg: { schema: "client:task_store:" } } });

  const scheduler = new Mass.MassTaskScheduler({ busConfig: { cfg: { schema: "client:bus:" } } });
  const task = scheduler.spawnTask(Mass.MassStreamTask, {
    // taskId: 0xFF,
    taskName: "ran-aizen's task",
    async streamProcessExecutor(env, bus) {

      const storeValue = await this.getStore("k");

      const src_1 = env.from(env.operators.GeneratorSource.create({
        emitter() { return Math.random() * 1000 >> 0; },
        frequency: 2000, limit: 5,
      }));
  
      const src_2 = env.from(env.operators.GeneratorSource.create({
        frequency: 1000, limit: 6,
      }));
  
      const calc = src_1.tap(elem => console.log("Tap", elem, storeValue));
  
      src_2.pipe(calc);
  
      calc.to(env.operators.ValidateSink.create(elem => elem.record > 600 || elem.record <= 1));
      calc.to(env.operators.ValidateSink.create(elem => elem.record < 1000));
    },
  });

  task.grab();
  await scheduler.bootstrap();
})()
.catch(err => console.log("throw:", err));