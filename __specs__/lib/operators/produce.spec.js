const { stream: { Env } } = require("../../..")();

describe("operators: produce", () => {
  it("should work as expected", async () => {
    const env = new Env(null);
    const producer = env.operators.ProduceCalculator.create({
      a(elem) { return elem.record + 1 },
      b(elem) { return elem.record + 2 },
    });

    env.generate({ limit: 1, frequency: 100, emitter() { return 1; } }).produce(producer)

    await env
    .generate({ limit: 1, frequency: 100, emitter() { return 1; } })
    .produce(producer)
    .produce({
      a(elem) { return elem.record.a + 1 },
      b(elem) { return elem.record.b + 2 },
    })
    .validate(elem => {
      expect(elem.record.a).toBe(3);
      expect(elem.record.b).toBe(5);
      return true;
    });
  });
});