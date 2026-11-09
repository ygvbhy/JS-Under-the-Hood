async function* gen() {
  try {
    yield 1;
    yield 2;
  } finally {
    await null;
    console.log('정리');
  }
}
async function run() {
  for await (const v of gen()) {
    console.log(v);
    break;
  }
  console.log('반복문 뒤');
}
var p = run();
