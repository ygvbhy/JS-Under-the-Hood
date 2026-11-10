var resolveA, rejectB;
var a = new Promise(function (resolve) { resolveA = resolve; });
var b = new Promise(function (resolve, reject) { rejectB = reject; });
Promise.allSettled([a, b]).then(function (results) {
  results.forEach(function (r) {
    console.log(r.status, r.status === 'fulfilled' ? r.value : r.reason.message);
  });
});
rejectB(new Error('b failed'));
resolveA('A');
