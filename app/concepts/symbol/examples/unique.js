var a = Symbol('id');
var b = Symbol('id');
console.log(a === b, a === a);
console.log(typeof a, a.description, String(a));
console.log(Symbol().description, String(Symbol()));
