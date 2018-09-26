const { stream: { Env } } = require("../../..")();

describe("operators: shard", () => {
  it("should work as expected", async () => {
    const env = new Env(null);
    const dataset = [
      {
        k: "x"
      },
      {
        k: "y"
      },
      {
        k: "z"
      },
    ];

    await env
    .generate({
      limit: 1,
      frequency: 100,
      emitter() { return dataset.shift(); }
    })
    .shard(elem => elem.k)
    .pipeline(async shard => {
      await shard
      .validate(elem => {
        expect(elem.record.k).toMatch(/^x|y|z$/);
        return true;
      });
    })
    .pipeline(async shard => {
      const sharder = env.operators.ShardCalculator.create(elem => elem.x);

      env.generate({
        limit: 1,
        frequency: 100,
        emitter() {
          return { k: "z" };
        },
      })
      .shard(sharder);

      await shard
      .shard(sharder)
      .pipeline(async shard => {
        await 
        shard
        .validate(elem => {
          expect(elem.record.k).toMatch(/x|y|z/);
          return true;
        });
      })
    });
  });
});