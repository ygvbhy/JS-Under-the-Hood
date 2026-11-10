var resolveA, rejectB;
var a = new Promise(function (resolve) { resolveA = resolve; });
var b = new Promise(function (resolve, reject) { rejectB = reject; });
var all = Promise.all([a, b]);
all.catch(function (e) {
  console.log('all rejected', e.message);
  resolveA('A');
});
a.then(function (v) { console.log('a still fulfilled', v); });
rejectB(new Error('b failed'));
console.log('sync end');
