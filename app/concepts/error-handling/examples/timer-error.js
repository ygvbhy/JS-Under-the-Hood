window.addEventListener('error', function (event) {
  console.log('error 이벤트: ' + event.error.message);
  event.preventDefault();
});
try {
  setTimeout(function () {
    throw new Error('타이머 안');
  }, 0);
  console.log('try 끝');
} catch (e) {
  console.log('catch: ' + e.message);
}
setTimeout(function () {
  console.log('다음 타이머');
}, 0);
console.log('스크립트 끝');
