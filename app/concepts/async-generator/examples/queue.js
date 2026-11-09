async function* gen() {
  console.log('본문 시작');
  await null;
  yield 'a';
  console.log('a 뒤');
  yield 'b';
  console.log('b 뒤');
}
var it = gen();
var p1 = it.next();
p1.then((r) => console.log('1번:', JSON.stringify(r)));
var p2 = it.next();
p2.then((r) => console.log('2번:', JSON.stringify(r)));
var p3 = it.next();
p3.then((r) => console.log('3번:', JSON.stringify(r)));
console.log('동기 코드 끝');
