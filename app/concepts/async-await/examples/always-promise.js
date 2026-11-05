async function one() {
  return 1;
}
var p = one();
console.log(p instanceof Promise);
console.log(p === one());
p.then(function (v) {
  console.log('value ' + v);
});
console.log('sync end');
