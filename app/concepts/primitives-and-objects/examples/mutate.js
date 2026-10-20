const p = { n: 1 };
const q = p;
q.n = 2;
console.log(p.n, p === q);
