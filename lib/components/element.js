class MassElement {
  constructor(struct) {
    this.record = struct.record;
    this.eventTime = struct.timestamp;
    this.packedTime = new Date();
    this.path = [];
    this.customFields = {};
  }

  markTimestamp(timestamp) {
    this.eventTime = timestamp;
  }
  markAccessOperator(op) {
    this.path.push(op);
    this.lastAccessedBy = op;
  }
  markWindowTime(timestamp) {
    this.windowTime = timestamp;
  }

  setCustomField(k, v) {
    this.customFields[k] = v;
  }
  getCustomField(k) {
    this.customFields[k];
  }
}

class MassElementSet extends MassElement {

}

module.exports = {
  MassElement, MassElementSet,
};