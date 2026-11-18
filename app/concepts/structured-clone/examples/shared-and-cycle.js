const o = { n: 1 };
const shared = { left: o, right: o };
const c = structuredClone(shared);
console.log(c.left === c.right, c.left === o);
const a = { name: 'a' };
a.self = a;
const c2 = structuredClone(a);
console.log(c2.self === c2, c2 === a);
