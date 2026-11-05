var inner = new Promise(function (resolve) {
  resolve('inner value');
});
var start = Promise.resolve('start');
var outer = start.then(function () {
  return inner;
});
var last = outer.then(function (v) {
  console.log('outer got', v);
});
console.log(outer === inner, Promise.resolve(inner) === inner);
