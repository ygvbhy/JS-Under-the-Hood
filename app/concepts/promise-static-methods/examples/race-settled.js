var early = Promise.resolve('early');
var late = Promise.resolve('late');
Promise.race([late, early]).then(function (v) { console.log('race 1', v); });
var resolveSlow;
var slow = new Promise(function (resolve) { resolveSlow = resolve; });
Promise.race([slow, 'now']).then(function (v) { console.log('race 2', v); });
resolveSlow('slow');
