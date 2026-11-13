var it = 'a1b22'.matchAll(/[0-9]+/g);
console.log(Array.isArray(it), 'length' in it);
console.log(Object.prototype.toString.call(it), it[Symbol.iterator]() === it);
var first = [...it];
var second = [...it];
console.log(first.length, second.length);
