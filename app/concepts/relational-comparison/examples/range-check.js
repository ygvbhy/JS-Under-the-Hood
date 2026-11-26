function inRange(v) {
  return v >= 0 && v <= 10;
}
console.log(inRange(null), inRange(undefined), inRange(''), inRange(' '));
console.log(inRange('5'), inRange('abc'), inRange(false), inRange(11));
