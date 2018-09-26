class SkipList {
  constructor(maxLevel, p) {
    this.init();
    this.MAX_LEVEL = maxLevel || 32;
    this.p = p || 0.5;
  }

  init() {
    this._size = 0;
    this.level = 0;
    this.head = new SkipListNode(-Infinity, null, 1);
    this.tail = new SkipListNode(Infinity, null, 1);

    this.head.getLevel(0).nextNode = this.tail;
    this.tail.getLevel(0).nextNode = null;
  }

  insert(score, value) {
    if ([-Infinity, Infinity].includes(score)) return;

    let node = this.head;
    let prevNodes = [];

    for (let level = this.level; level >= 0; level--) {
      while (node && node.getLevel(level)) {
        let nextNode = node.getLevel(level).nextNode;
        if (nextNode.score === score) {
          nextNode.value = value;
          return;
        } else if (nextNode.score < score) {
          node = nextNode;
        } else {
          break;
        }
      }

      prevNodes[level] = node;
    }

    const newLevels = this.generateRandomLevels();
    const newNode = new SkipListNode(score, value, newLevels);
    this.level = Math.max(this.level, newLevels - 1);

    for (let level = 0; level < newLevels; level++) {
      if (!prevNodes[level]) {
        let levelEntry = new SkipListLevel(level);
        levelEntry.nextNode = this.tail;
        this.head.setLevel(level, levelEntry);
        prevNodes[level] = this.head;
      }

      const prevLevel = prevNodes[level].getLevel(level);
      const newLevel = newNode.getLevel(level);
      newLevel.nextNode = prevLevel.nextNode;
      prevLevel.nextNode = newNode;
    }

    this._size++;
  }

  generateRandomLevels() {
    for (let i = 0; i < this.MAX_LEVEL; i++) {
      if (Math.random() > this.p) return i + 1;
    }

    return this.MAX_LEVEL;
  }

  delete(score) {
    if ([-Infinity, Infinity].includes(score)) return false;

    let node = this.head;
    let found = false;

    for (let level = this.level; level >= 0; level--) {
      while (node && node.getLevel(level)) {
        let nextNode = node.getLevel(level).nextNode;
        if (nextNode.score === score) {
          if (!found) found = true;
          const nNextNode = nextNode.getLevel(level).nextNode;
          if (node === this.head && nNextNode === this.tail) {
            this.level--;
          }
          node.getLevel(level).nextNode = nNextNode;
          break;
        } else if (nextNode.score < score) {
          node = nextNode;
        } else {
          break;
        }
      }
    }

    this.level = Math.max(this.level, 0);
    if (found) {
      this._size--;
      return true;
    }
    return false;
  }

  search(score) {
    if ([-Infinity, Infinity].includes(score)) return null;

    let node = this.head;

    for (let level = this.level; level >= 0; level--) {
      while (node && node.getLevel(level)) {
        let nextNode = node.getLevel(level).nextNode;
        if (nextNode.score === score) {
          return nextNode.value;
        } else if (nextNode.score < score) {
          node = nextNode;
        } else {
          break;
        }
      }
    }

    return null;
  }

  range(closedLeftScore, openedRightScore) {
    let node = this.head;

    for (let level = this.level; level >= 0; level--) {
      while (node && node.getLevel(level)) {
        let nextNode = node.getLevel(level).nextNode;
        if (nextNode.score === closedLeftScore) {
          return this.seq(nextNode, openedRightScore);
        } else if (nextNode.score < closedLeftScore) {
          node = nextNode;
        } else {
          break;
        }
      }
    }

    return this.seq(node.getLevel(0).nextNode, openedRightScore);
  }

  seq(startNode, openedRightScore) {
    let node = startNode;
    let seq = [];
    while (node.getLevel(0).nextNode && node.score < openedRightScore) {
      seq.push(node.value);
      node = node.getLevel(0).nextNode;
    }

    return seq;
  }

  shift() {
    let firstNode = this.head.getLevel(0).nextNode;
    this.delete(firstNode.score);
    return firstNode;
  }

  get size() {
    return this._size;
  }

  get travel() {
    let ret = new Map();
    let node = this.head.getLevel(0).nextNode;
    let nextNode = node.getLevel(0).nextNode;

    while (nextNode) {
      ret.set(node.score, node.value);
      node = nextNode;
      nextNode = nextNode.getLevel(0).nextNode;
    }

    return ret;
  }
}

class SkipListNode {
  constructor(score, value, levels) {
    this.levels = this.initLevels(levels);
    this.score = score;
    this.value = value;
  }

  initLevels(levels) {
    let levelEntries = [];

    for (let i = 0; i < levels; i++) {
      levelEntries.push(new SkipListLevel(i));
    }

    return levelEntries;
  }

  get level() {
    return this.levels.length - 1;
  }

  getLevel(level) {
    return this.levels[level];
  }

  setLevel(level, skipListLevel) {
    this.levels[level] = skipListLevel;
  }
}

class SkipListLevel {
  constructor(level) {
    this.level = level;
    this._nextNode;
    // this._prevNode;
  }

  get nextNode() { return this._nextNode; }
  // get prevNode() { return this._prevNode; }

  set nextNode(skipListNode) { this._nextNode = skipListNode; }
  // set prevNode(skipListNode) { this._prevNode = skipListNode; }
}

module.exports = SkipList;