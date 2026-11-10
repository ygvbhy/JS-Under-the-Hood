const d = new Date(2026, 0, 1);
const result = d.setDate(15);
console.log(typeof result, result === d.getTime());
console.log(d.getDate());
