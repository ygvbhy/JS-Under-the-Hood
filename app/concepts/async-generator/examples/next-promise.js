async function* gen() {
  console.log('본문 시작');
  yield 1;
  console.log('본문 끝');
}
const it = gen();
console.log('호출 뒤');
const first = it.next();
console.log(first instanceof Promise);
first.then((r) => console.log(JSON.stringify(r)));
console.log('동기 코드 끝');
