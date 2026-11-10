var resolveA, resolveB;
var a = new Promise(function (resolve) { resolveA = resolve; });
var b = new Promise(function (resolve) { resolveB = resolve; });
var all = Promise.all([a, b, 'c']);
all.then(function (values) { console.log('all', JSON.stringify(values)); });
resolveB('B');
console.log('B resolved');
resolveA('A');
console.log('A resolved');
