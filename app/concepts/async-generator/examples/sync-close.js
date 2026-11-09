function* source() {
  try {
    yield 1;
    yield Promise.reject(new Error('실패'));
    yield 3;
  } finally {
    console.log('동기 제너레이터 정리');
  }
}
async function run() {
  try {
    for await (const v of source()) {
      console.log(v);
    }
  } catch (e) {
    console.log('잡음:', e.message);
  }
}
run();
