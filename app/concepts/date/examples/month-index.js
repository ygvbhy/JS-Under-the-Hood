const a = new Date(2026, 1, 10);
const b = new Date('2026-02-10T09:00');
console.log(a.getMonth(), b.getMonth());
console.log(a.getDate() === b.getDate());
