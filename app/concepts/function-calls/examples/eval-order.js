function square(n) {
  console.log('square ' + n);
  return n * n;
}
function add(a, b) {
  console.log('add 시작');
  return a + b;
}
const total = add(square(2), square(3));
console.log(total);
