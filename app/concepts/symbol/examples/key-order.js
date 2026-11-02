var s = Symbol('s');
var obj = { b: 1, 2: 1, [s]: 1, a: 1, 1: 1 };
console.log(JSON.stringify(Object.keys(obj)));
console.log(Reflect.ownKeys(obj).map(String).join(', '));
