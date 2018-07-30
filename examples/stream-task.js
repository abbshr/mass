(async () => {
  const Mass = await require("..")({ task_store: { cfg: { schema: "client:task_store:" } } });

  const scheduler = new Mass.MassTaskScheduler({ busConfig: { cfg: { schema: "client:bus:" } } });
  const task = scheduler.spawnTask(Mass.MassStreamTask, {
    taskId: 0xFF,
    taskName: "ran-aizen's task",
    async streamProcessExecutor(env, bus) {
      const src_1 = env.from(new env.operators.GeneratorSource(null, {
        emitter() { return Math.random() * 1000 >> 0; },
        frequency: 2000,
        limit: 5,
      }));
  
      const src_2 = env.from(new env.operators.GeneratorSource(null, {
        frequency: 1000,
        limit: 6,
      }));
  
      const calc = src_1.tap(elem => console.log("Tap", elem));
  
      src_2.pipe(calc);
  
      calc.to(new env.operators.ValidateSink(null, elem => {
        console.log("CHECK_1:", elem);
        return elem.record > 600 || elem.record <= 1;
      }));
  
      calc.to(new env.operators.ValidateSink(null, elem => {
        console.log("CHECK_2:", elem);
        return elem.record < 1000;
      }));
    },
  });

  task.sched();
  await scheduler.bootstrap();
})();