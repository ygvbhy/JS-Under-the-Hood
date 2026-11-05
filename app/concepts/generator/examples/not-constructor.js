function* gen() {
  yield 1;
}
try {
  new gen();
} catch (e) {
  console.log('new: ' + e.name);
}
function* selfCall() {
  var me = yield;
  try {
    me.next();
  } catch (e) {
    console.log('실행 중 next: ' + e.name);
  }
}
var it = selfCall();
it.next();
it.next(it);
