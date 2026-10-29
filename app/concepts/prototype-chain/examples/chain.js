const base = { kind: 'book' };
const mid = Object.create(base);
mid.lang = 'ko';
const item = Object.create(mid);
item.title = 'JS';
console.log(item.title);
console.log(item.lang);
console.log(item.kind);
console.log(item.price);
