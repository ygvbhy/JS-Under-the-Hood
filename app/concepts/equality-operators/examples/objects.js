const p = { n: 1 };
const q = { n: 1 };
const r = p;
console.log(p == q, p === q, p === r);
console.log(p == '[object Object]');
