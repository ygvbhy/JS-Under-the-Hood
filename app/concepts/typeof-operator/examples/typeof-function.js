function add(a, b) {
  return a + b;
}
const sub = function (a, b) {
  return a - b;
};
console.log(typeof add, typeof sub, typeof add(1, 2));
