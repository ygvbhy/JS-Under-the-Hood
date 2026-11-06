async function noAwait() {
  try {
    return Promise.reject(new Error('거부'));
  } catch (e) {
    return 'catch가 잡음';
  }
}
async function withAwait() {
  try {
    return await Promise.reject(new Error('거부'));
  } catch (e) {
    return 'catch가 잡음';
  }
}
noAwait().then(
  function (v) {
    console.log('noAwait 이행: ' + v);
  },
  function (e) {
    console.log('noAwait 거부: ' + e.message);
  }
);
withAwait().then(function (v) {
  console.log('withAwait 이행: ' + v);
});
