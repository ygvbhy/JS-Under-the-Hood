var never = new Promise(function () {});
var fail = Promise.reject(new Error('boom'));
var all = Promise.all([1, Promise.resolve(2), 'three']);
var allFail = Promise.all([Promise.resolve(1), fail, never]);
var settled = Promise.allSettled([Promise.resolve(1), fail]);
var race = Promise.race([never, Promise.resolve('race ok')]);
var any = Promise.any([fail, Promise.resolve('any ok')]);
var anyFail = Promise.any([fail, Promise.reject(new Error('boom 2'))]);
Promise.allSettled([all, allFail, race, any, anyFail]).then(function (results) {
  results.forEach(function (r) {
    var shown = r.status === 'fulfilled' ? JSON.stringify(r.value) : r.reason.name;
    console.log(r.status, shown);
  });
  return settled;
}).then(function (list) {
  console.log(JSON.stringify(list.map(function (x) { return x.status; })));
});
