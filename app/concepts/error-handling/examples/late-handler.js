var p = Promise.reject(new Error('거부'));
window.addEventListener('unhandledrejection', function (event) {
  console.log('unhandledrejection');
  event.preventDefault();
  setTimeout(function () {
    p.catch(function () {
      console.log('뒤늦게 잡음');
    });
  }, 0);
});
window.addEventListener('rejectionhandled', function () {
  console.log('rejectionhandled');
});
