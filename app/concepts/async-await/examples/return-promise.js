async function returnsPromise() {
  return Promise.resolve('promise');
}
async function returnsValue() {
  return 'value';
}
returnsPromise().then(function (v) {
  console.log('returnsPromise: ' + v);
});
returnsValue().then(function (v) {
  console.log('returnsValue: ' + v);
});
Promise.resolve()
  .then(function () {
    console.log('tick 1');
  })
  .then(function () {
    console.log('tick 2');
  })
  .then(function () {
    console.log('tick 3');
  });
