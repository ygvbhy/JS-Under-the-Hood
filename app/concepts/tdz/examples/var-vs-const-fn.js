try {
  cube(2);
} catch (e) {
  console.log(e.name);
}
try {
  square(3);
} catch (e) {
  console.log(e.name);
}
var cube = function (n) {
  return n * n * n;
};
const square = function (n) {
  return n * n;
};
console.log(cube(2) + square(3));
