window.addEventListener('unhandledrejection', function (event) {
  console.log('unhandledrejection');
  event.preventDefault();
});
var p = Promise.reject(new Error('거부'));
Promise.resolve().then(function () {
  p.catch(function () {
    console.log('마이크로태스크에서 잡음');
  });
});
