const { stream: { Env } } = require("../../..")();

describe("operators: select", () => {
  it("should work as expected", async () => {
    const env = new Env(null);
    const selector = env.operators.SelectCalculator.create(elem => elem.record % 2);

    let i = 0;
    env.generate({ limit: 1, frequency: 100, emitter() { return 0; } }).select(selector);

    await env
      .generate({ limit: 4, frequency: 100, emitter() { return i++; } })
      .select(selector)
      .select(elem => elem.record % 2)
      .validate(elem => {
        expect(elem.record % 2).not.toBe(0);
        return true;
      });
  });
});