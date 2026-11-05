Promise.resolve()
  .then(function () { console.log('a1'); })
  .then(function () { console.log('a2'); })
  .then(function () { console.log('a3'); });
Promise.resolve()
  .then(function () { console.log('b1'); })
  .then(function () { console.log('b2'); });
console.log('동기 코드 끝');
