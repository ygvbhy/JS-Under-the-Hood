async function* gen() {
  try {
    yield 1;
    console.log('실행되지 않음');
  } finally {
    console.log('정리');
  }
}
const it = gen();
it.next().then((r) => console.log('1번:', JSON.stringify(r)));
it.return('중단').then((r) => console.log('2번:', JSON.stringify(r)));
it.next().then((r) => console.log('3번:', JSON.stringify(r)));
