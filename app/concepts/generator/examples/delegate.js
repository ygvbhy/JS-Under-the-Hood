function* inner() {
  yield 'i1';
  yield 'i2';
  return 'inner의 반환값';
}
function* outer() {
  yield 'o1';
  var r = yield* inner();
  console.log('yield* 식의 값: ' + r);
  yield 'o2';
}
var values = [];
for (var v of outer()) {
  values.push(v);
}
console.log(JSON.stringify(values));
