window.addEventListener('unhandledrejection', function (event) {
  console.log('unhandledrejection: ' + event.reason.message);
  event.preventDefault();
});
try {
  Promise.reject(new Error('거부'));
  console.log('try 끝');
} catch (e) {
  console.log('catch: ' + e.message);
}
console.log('스크립트 끝');
