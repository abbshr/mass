class OpMap {
  constructor() {
    this.map = new Map();
    this.revmap = new Map();
  }

  distance(prevop, nextop) {
    return this.map.get(prevop).get(nextop);
  }

  connect(prevop, nextop) {
    let prevopConnections = this.map.get(prevop);
    if (!prevopConnections) {
      prevopConnections = new Map();
      this.map.set(prevop, prevopConnections);
    }
    prevopConnections.set(nextop, 1);

    let nextopRevConnections = this.revmap.get(nextop);
    if (!nextopRevConnections) {
      nextopRevConnections = new Map();
      this.revmap.set(nextop, nextopRevConnections);
    }
    nextopRevConnections.set(prevop, 1);

    let prevopRevConnections = this.revmap.get(prevop);
    if (!prevopRevConnections) {
      prevopRevConnections = new Map();
      this.revmap.set(prevop, prevopRevConnections);
    }

    let nextopConnections = this.map.get(nextop);
    if (!nextopConnections) {
      nextopConnections = new Map();
      this.map.set(nextop, nextopConnections);
    }

    for (const [op, distance] of prevopRevConnections) {
      const opConnections = this.map.get(op);
      opConnections.set(nextop, distance + 1);
      nextopRevConnections.set(op, distance + 1);

      for (const [nop, ndistance] of nextopConnections) {
        const nopRevConnections = this.revmap.get(nop);
        opConnections.set(nop, distance + 1 + ndistance);
        nopRevConnections.set(prevop, ndistance + 1);
        nopRevConnections.set(op, distance + 1 + ndistance);
      }
    }
  }
}

module.exports = OpMap;