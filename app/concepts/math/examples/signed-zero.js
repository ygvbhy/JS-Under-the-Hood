function show(n) { return Object.is(n, -0) ? '-0' : String(n); }
function naiveMax(a, b) { return b > a ? b : a; }
console.log(show(Math.max(-0, 0)), show(Math.max(0, -0)));
console.log(show(Math.min(0, -0)), show(Math.min(-0, 0)));
console.log(show(Math.max(-0)), show(Math.max(-0, -1)), show(Math.min(0)), show(Math.min(0, 1)));
console.log(show(naiveMax(-0, 0)), show(naiveMax(0, -0)));
