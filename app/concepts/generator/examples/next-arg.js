function* talk() {
  var a = yield 'first';
  console.log('a = ' + a);
  var b = yield 'second';
  console.log('b = ' + b);
  return 'end';
}
var it = talk();
var r1 = it.next('ignored');
console.log(r1.value + ' ' + r1.done);
var r2 = it.next('hi');
console.log(r2.value + ' ' + r2.done);
var r3 = it.next('bye');
console.log(r3.value + ' ' + r3.done);
var r4 = it.next('again');
console.log(r4.value + ' ' + r4.done);
