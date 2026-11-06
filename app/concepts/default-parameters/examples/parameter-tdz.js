var a = 'outer';
var b = 'outer';
function late(a = b, b = 1) {
  return a;
}
function self(a = a) {
  return a;
}
try {
  late();
} catch (e) {
  console.log(e.name);
}
try {
  self();
} catch (e) {
  console.log(e.name);
}
console.log(late(5), self(6));
