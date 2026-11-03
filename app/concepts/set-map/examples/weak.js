var wm = new WeakMap();
var key = {};
wm.set(key, 'data');
console.log(wm.get(key), wm.has(key), wm.has({}));
console.log(typeof wm.size, typeof wm.keys, typeof wm[Symbol.iterator]);
var ws = new WeakSet([key]);
console.log(ws.has(key), typeof ws.forEach);
