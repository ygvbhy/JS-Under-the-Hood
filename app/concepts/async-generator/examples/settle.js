async function* unwrapReturn() {
  return Promise.resolve('끝');
}
unwrapReturn().next().then((r) => console.log(JSON.stringify(r)));

async function* gen() {
  console.log('실행되지 않음');
}
const a = gen();
a.return(Promise.resolve('취소')).then((r) => console.log(JSON.stringify(r)));
const b = gen();
b.throw(new Error('거부')).catch((e) => console.log(e.message));
b.next().then((r) => console.log(JSON.stringify(r)));
