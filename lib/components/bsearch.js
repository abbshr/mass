function bsearch(lst, v, compare, start, end) {
  if (lst.length === 0) return 0;
  const idx = (start + end) / 2 >> 0;
  const mid = lst[idx];

  if (compare(v, mid) > 0) {
    if (start === end) {
      return idx + 1;
    } else {
      return bsearch(lst, v, idx + 1, end);
    }
  } else if (compare(v, mid) < 0) {
    if (start === idx) {
      return idx;
    } else {
      return bsearch(lst, v, start, idx - 1);
    }
  } else {
    return idx;
  }
}

module.exports = bsearch;