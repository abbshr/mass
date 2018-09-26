const { stream: { Env } } = require("../../..")();

describe("operators: mutate", () => {
  it("should work as expected", async () => {
    const env = new Env(null);
    const mutator = env.operators.MutateCalculator.create(elem => elem.x = 2);

    env.generate({
      limit: 1,
      frequency: 100,
      emitter() { return 1; }
    }).mutate(mutator);

    await env
      .generate({ limit: 1, frequency: 100, emitter() { return 1; } })
      .tap(elem => expect(elem.modifiedTime).toBeUndefined())
      .mutate(elem => elem.x = 1)
      .mutate(mutator)
      .validate(elem => {
        expect(elem.modifiedTime).toBeDefined();
        expect(elem.x).toBe(2);
        return true;
      });
  });
});