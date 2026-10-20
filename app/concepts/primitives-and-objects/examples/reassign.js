let a = 10;
let b = a;
b = 20;

let p = { n: 1 };
let q = p;
q = { n: 2 };

console.log(a, b, p.n, q.n);
