const lastOfFeb = new Date(2026, 2, 0);
console.log(lastOfFeb.getMonth(), lastOfFeb.getDate());
const nextYear = new Date(2026, 12, 1);
console.log(nextYear.getFullYear(), nextYear.getMonth());
const back = new Date(2026, 0, -1);
console.log(back.getFullYear(), back.getMonth(), back.getDate());
