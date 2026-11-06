function inner() {
  throw new Error('전파');
}
function middle() {
  try {
    inner();
    console.log('실행되지 않음');
  } finally {
    console.log('middle finally');
  }
}
function outer() {
  middle();
  console.log('실행되지 않음');
}
try {
  outer();
} catch (e) {
  console.log('잡음: ' + e.message);
}
console.log('이어서 실행');
