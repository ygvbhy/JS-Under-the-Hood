function d() {}
var a = function b() {};
(function c() {});
console.log(typeof a, typeof b, typeof c, typeof d);
try {
  b;
} catch (e) {
  console.log(e.name);
}
console.log(typeof function w() {});
console.log(typeof w);
