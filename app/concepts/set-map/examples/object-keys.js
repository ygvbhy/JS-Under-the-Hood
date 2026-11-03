var a = { id: 1 };
var b = { id: 1 };
var seen = new Set([a, b, a]);
console.log(seen.size, seen.has(a), seen.has({ id: 1 }));
var meta = new Map();
meta.set(a, 'first');
a.id = 99;
console.log(meta.get(a), meta.get(b), meta.has({ id: 99 }));
