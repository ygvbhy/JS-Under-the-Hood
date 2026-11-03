var obj = { b: 1, a: 2, 10: 3, 2: 4 };
var map = new Map([['b', 1], ['a', 2], [10, 3], [2, 4]]);
console.log(JSON.stringify(Object.keys(obj)));
console.log(JSON.stringify([...map.keys()]));
map.set('b', 100);
map.delete('a');
map.set('a', 200);
console.log(JSON.stringify([...map]));
