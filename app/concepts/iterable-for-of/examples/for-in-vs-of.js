var list = ['x', 'y'];
list.extra = 'z';
var keys = [];
for (var k in list) keys.push(k);
var values = [];
for (var v of list) values.push(v);
console.log(JSON.stringify(keys), JSON.stringify(values));
