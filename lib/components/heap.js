class BinaryHeap {
  constructor(orderFn) {
    this.orderFn = orderFn;
    this.arr = [];
    this.lastIdx = -1;
  }
  insert(elem) {
    this.arr[this.size] = elem;
    this.lastIdx++;

    let i = this.size

    while (i > 1) {
      let pi = i / 2 >> 0;

      if (this.orderFn(this.arr[i - 1], this.arr[pi - 1])) {
        this.swap(i - 1, pi - 1);
        i = pi;
      } else {
        break;
      }
    }
  }
  pop() {
    if (this.lastIdx < 0) return;

    let head = this.head;
    let last = this.arr.pop();
    this.lastIdx--;
    if (this.size < 1) {
      return last;
    } else {
      this.head = last;
    }

    let i = 1;
    while (i <= this.size) {
      const lci = 2 * i;
      const rci = 2 * i + 1;
      let mci = null;

      if (rci > this.size) {
        if (lci > this.size) break;
        mci = lci;
      } else {
        if (this.orderFn(this.arr[lci - 1], this.arr[rci - 1])) {
          mci = lci;
        } else {
          mci = rci;
        }
      }

      if (this.orderFn(this.arr[mci - 1], this.arr[i - 1])) {
        this.swap(mci - 1, i - 1);
        i = mci;
      } else {
        break;
      }
    }
    return head;
  }

  swap(ix, iy) {
    [this.arr[ix], this.arr[iy]] = [this.arr[iy], this.arr[ix]];
  }

  get head() {
    return this.arr[0];
  }

  set head(elem) {
    this.arr[0] = elem;
  }

  get tail() {
    return this.arr[this.lastIdx];
  }

  get size() {
    return this.lastIdx + 1;
  }

  get sorted() {
    let sorted = [];
    while (this.size > 0) {
      sorted.push(this.pop());
    }

    return sorted;
  }
}

module.exports = BinaryHeap;