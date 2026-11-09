async function* gen() {
  console.log('gen 1');
  yield 1;
  console.log('gen 2');
  yield 2;
  console.log('gen 끝');
}
async function run() {
  for await (const v of gen()) {
    console.log('본문 시작', v);
    await null;
    console.log('본문 끝', v);
  }
  console.log('반복문 뒤');
}
run();
console.log('동기 코드 끝');
