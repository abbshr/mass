const OffsetManager = require("../../lib/components/offset-manager");
const om = new OffsetManager("test-id");

describe("components offset manager", () => {
  it("init should work as expected", async () => {
    expect(om.autoCommitor).toBeUndefined();
    expect(om.mirror).toBeUndefined();
    expect(om.snapshot).toBeUndefined();
    await om.init();
    expect(om.autoCommitor).toBeDefined();
    expect(om.mirror).toBeDefined();
    expect(om.snapshot).toBeDefined();
  });

  it("update & commit to work as expected", async () => {
    expect(await om.getOffset("t", 0)).toBeUndefined();
    await om.update("t:0", {}, 100);
    await om.commit();
    expect(await om.getOffset("t", 0)).toBe(100);
  });
});