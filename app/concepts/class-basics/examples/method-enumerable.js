function Legacy() { this.own = 1; }
Legacy.prototype.hello = function () {};
class Modern { constructor() { this.own = 1; } hello() {} }
var keys1 = [];
for (var k1 in new Legacy()) keys1.push(k1);
var keys2 = [];
for (var k2 in new Modern()) keys2.push(k2);
console.log(JSON.stringify(keys1), JSON.stringify(keys2));
console.log(Object.getOwnPropertyDescriptor(Modern.prototype, 'hello').enumerable);
