async function* gen() {
  yield 1;
  throw new Error('본문 오류');
}
const it = gen();
it.next().then((r) => console.log(JSON.stringify(r)));
it.next().catch((e) => console.log('거부:', e.message));
it.next().then((r) => console.log(JSON.stringify(r)));
