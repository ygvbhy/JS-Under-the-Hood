var it = ['a', 'b'][Symbol.iterator]();
var r1 = it.next();
var r2 = it.next();
var r3 = it.next();
console.log(r1.value, r1.done, r2.value, r2.done);
console.log(r3.value, r3.done, 'value' in r3, JSON.stringify(r3));
console.log(typeof it.next, Object.keys(r1).join(','));
