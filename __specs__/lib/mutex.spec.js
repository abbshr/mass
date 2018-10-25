const mockMutil = {
  exec() {

  },
  exec_OK() {
    return "OK"
  },
  exec_ConnError() {
    throw new Error()
  },
  exec_HasBeenModified() {
    return null
  },
}

jest.mock("../../lib/components/get-redis", () => () => ({
  async watch() {},
  async watch_OK() {},
  async watch_ConnError() {
    throw new Error()
  },

  async get() {},
  async get_Occupy() {
    return "occupy"
  },
  async get_NotOccupy() {
    return "free"
  },
  async get_ConnError() {
    throw new Error()
  },

  async multi() {
    return {
      set() {
        return mockMutil;
      },
    }
  },

  async set() {},
  async set_OK() {
    return "OK"
  },
  async set_ConnError() {
    throw new Error()
  },
}))

jest.mock("../../lib/syslog", () => ({
  child() {
    return {
      error() {},
      fatal() {},
      unknown() {},
      info() {},
      warn() {},
      debug() {},
      trace() {},
    }
  }
}))

const Mutex = require("../../lib/components/mutex")

describe("lib/mutex acquire failure story", () => {
  it("#acquire() should failed when mutex was occupied", async () => {
    const resourceId = "resource"
    const mutex = new Mutex(resourceId)

    mutex.keeper.get = mutex.keeper.get_Occupy
    mutex.keeper.watch = mutex.keeper.watch_OK
    mockMutil.exec = mockMutil.exec_OK

    expect(await mutex.acquire()).toBeInstanceOf(Error)
  })

  it("#acquire() should failed when mutex was occupied in concurrent acquiring", async () => {
    const resourceId = "resource"
    const mutex = new Mutex(resourceId)

    mutex.keeper.get = mutex.keeper.get_NotOccupy
    mutex.keeper.watch = mutex.keeper.watch_OK
    mockMutil.exec = mockMutil.exec_HasBeenModified

    expect(await mutex.acquire()).toBeInstanceOf(Error)
  })
})