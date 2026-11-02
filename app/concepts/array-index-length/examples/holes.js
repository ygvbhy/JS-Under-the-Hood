var a = [1, , 3];
var b = [1, undefined, 3];
console.log(a.length, 1 in a, a[1]);
console.log(b.length, 1 in b, b[1]);
delete b[2];
console.log(b.length, 2 in b, JSON.stringify(Object.keys(b)));
