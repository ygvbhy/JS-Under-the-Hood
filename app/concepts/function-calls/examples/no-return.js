function greet(name) {
  console.log('안녕, ' + name);
}
function half(n) {
  if (n < 0) {
    return;
  }
  console.log('계산');
  return n / 2;
}
const a = greet('민지');
const b = half(-4);
const c = half(10);
console.log(a, b, c);
