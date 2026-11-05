function note() {
  console.log('기본값 평가');
  return 1;
}
function* start(x = note()) {
  console.log('본문 시작');
  yield x;
}
var it = start();
console.log('제너레이터 객체를 받음');
var r = it.next();
console.log(r.value + ' ' + r.done);
