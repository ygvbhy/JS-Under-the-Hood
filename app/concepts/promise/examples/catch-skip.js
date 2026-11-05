Promise.reject(new Error('no data'))
  .then(function (v) {
    console.log('skipped', v);
    return 'never';
  })
  .then(null, undefined)
  .catch(function (e) {
    console.log('caught', e.message);
  })
  .then(function (v) {
    console.log('after catch', v);
    return Promise.resolve(7).then('not a function');
  })
  .then(function (v) {
    console.log('passed through', v);
  });
