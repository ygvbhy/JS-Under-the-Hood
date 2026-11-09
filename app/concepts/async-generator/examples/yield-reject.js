async function* gen() {
  try {
    yield Promise.reject(new Error('실패'));
    console.log('여기는 실행되지 않음');
  } catch (e) {
    console.log('본문에서 잡음:', e.message);
    yield '복구';
  }
}
gen().next().then((r) => console.log(JSON.stringify(r)));
