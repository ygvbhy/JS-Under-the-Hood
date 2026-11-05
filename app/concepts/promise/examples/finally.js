Promise.resolve('data')
  .finally(function () {
    console.log('cleanup 1', arguments.length);
    return 'ignored';
  })
  .then(function (v) {
    console.log('after finally', v);
    return Promise.reject(new Error('failed'));
  })
  .finally(function () {
    console.log('cleanup 2');
  })
  .catch(function (e) {
    console.log('still rejected', e.message);
    return Promise.resolve('ok').finally(function () {
      throw new Error('cleanup failed');
    });
  })
  .catch(function (e) {
    console.log('replaced by', e.message);
  });
