async function fn() {
  try {
    return Promise.reject(new Error('실패'));
  } catch (e) {
    return '잡음';
  }
}
async function* gen() {
  try {
    return Promise.reject(new Error('실패'));
  } catch (e) {
    return '잡음';
  }
}
fn()
  .catch((e) => console.log('async 함수: 거부', e.message))
  .then(() => gen().next())
  .then((r) => console.log('async 제너레이터:', JSON.stringify(r)));
