var count = 0;
function next() {
  count += 1;
  return count;
}
var { p = next(), q = next() } = { p: 'given' };
console.log(p, q, count);
var [first = 1, second = first * 10] = [];
console.log(first, second);
