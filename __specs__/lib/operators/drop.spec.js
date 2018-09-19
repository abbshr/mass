const { stream: { Env } } = require("../../..")();

describe("operators: drop", () => {
  it("should work as expected", async () => {
    const env = new Env(null);
    const dropper = env.operators.DropCalculator.create(elem => elem.record % 2);
    let i = 0;

    env.generate({ limit: 1, frequency: 100, emitter() { return 0; } }).drop(dropper);

    await env
    .generate({ limit: 4, frequency: 100, emitter() { return i++; } })
    .drop(elem => elem.record % 2)
    .drop(dropper)
    .validate(elem => {
      expect(elem.record % 2).toBe(0);
      return true;
    });
  });
});