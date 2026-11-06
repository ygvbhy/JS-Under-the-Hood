function decide(label) {
  return Promise.resolve().then(function () {
    console.log(label + ' 결과 정해짐');
  });
}
async function noAwait() {
  try {
    return decide('noAwait');
  } finally {
    console.log('noAwait finally');
  }
}
async function withAwait() {
  try {
    return await decide('withAwait');
  } finally {
    console.log('withAwait finally');
  }
}
noAwait().then(function () {
  return withAwait();
});
