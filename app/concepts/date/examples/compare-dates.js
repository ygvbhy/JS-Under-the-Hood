const a = new Date(Date.UTC(2026, 0, 1));
const b = new Date(Date.UTC(2026, 0, 1));
console.log(a === b, a == b);
console.log(a.getTime() === b.getTime(), +a === +b);
console.log(a <= b && a >= b);
