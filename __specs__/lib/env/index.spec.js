const Env = require("../../../lib/env");

describe("stream env", () => {
  it("a pipeline (generate -> tap -> validate) should work as expected", async () => {
    const pipeline =
      new Env(null)
        .generate({ frequency: 100, limit: 20 })
        .tap(elem => expect(elem).toEqual({ record: 1 }))
        .validate(elem => {
          expect(elem).toEqual({ record: 1 });
          return elem.record === 1;
        });
    await expect(pipeline).resolves.not.toBeInstanceOf(Error);
  });

  it("a pipeline (generate -> tap -> validate) should work as expected", async () => {
    const pipeline =
      new Env(null)
        .generate({ frequency: 100, limit: 20, emitter() { return 2; } })
        .tap(elem => expect(elem).toEqual({ record: 2 }))
        .validate(elem => {
          expect(elem).toEqual({ record: 2 });
          return elem.record === 1;
        });
    await expect(pipeline).rejects.toBeInstanceOf(Error);
  });
});