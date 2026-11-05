function* guard() {
  try {
    yield 'ready';
  } catch (e) {
    console.log('잡음: ' + e.message);
    yield 'recovered';
  }
  return 'done';
}
var it = guard();
var r1 = it.next();
console.log(r1.value + ' ' + r1.done);
var r2 = it.throw(new Error('boom'));
console.log(r2.value + ' ' + r2.done);
var r3 = it.next();
console.log(r3.value + ' ' + r3.done);
try {
  it.throw(new Error('또'));
} catch (e) {
  console.log('바깥에서 잡음: ' + e.message);
}
