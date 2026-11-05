function* count() {
  console.log('본문 시작');
  yield 1;
  console.log('본문 끝');
}
var it = count();
console.log('제너레이터 객체를 받음');
var r = it.next();
console.log(r.value + ' ' + r.done);
