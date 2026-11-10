const bad = new Date('not a date');
console.log(String(bad.getTime()), String(bad));
console.log(String(bad.setDate(1)), String(bad.getMonth()));
console.log(Number.isNaN(new Date(2026, 0, NaN).getTime()));
