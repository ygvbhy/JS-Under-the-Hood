async function load() {
  try {
    await Promise.reject(new Error('실패'));
    console.log('여기는 실행되지 않음');
  } catch (e) {
    console.log('잡음: ' + e.message);
  }
  return '계속';
}
load().then(function (v) {
  console.log('결과: ' + v);
});
