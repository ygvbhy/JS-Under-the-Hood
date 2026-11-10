const start = new Date(2026, 0, 1);
const end = start;
end.setDate(end.getDate() + 7);
console.log(start.getDate(), start === end);
const copy = new Date(start);
copy.setDate(1);
console.log(start.getDate(), copy.getDate());
