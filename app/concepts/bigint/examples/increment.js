let a = 1n;
const old = a++;
console.log(typeof old, String(old), typeof a, String(a));
let b = 1n;
try {
  b = b + 1;
} catch (e) {
  console.log(e.name);
}
b++;
console.log(typeof b, String(b));
let c = 1n;
try {
  c += 1;
} catch (e) {
  console.log(e.name, String(c));
}
c += 1n;
console.log(typeof c, String(c));
