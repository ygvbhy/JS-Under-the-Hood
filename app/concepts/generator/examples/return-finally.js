function* task() {
  try {
    yield 'step 1';
    yield 'step 2';
  } finally {
    console.log('정리');
  }
}
var it = task();
var r1 = it.next();
console.log(r1.value + ' ' + r1.done);
var r2 = it.return('중단');
console.log(r2.value + ' ' + r2.done);
var r3 = it.next();
console.log(r3.value + ' ' + r3.done);
var early = task();
var r4 = early.return('시작 전');
console.log(r4.value + ' ' + r4.done);
var r5 = it.return('또');
console.log(r5.value + ' ' + r5.done);
