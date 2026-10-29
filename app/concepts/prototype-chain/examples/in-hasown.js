const base = { kind: 'book' };
const item = Object.create(base);
item.title = 'JS';
console.log('title' in item);
console.log('kind' in item);
console.log('toString' in item);
console.log(Object.hasOwn(item, 'title'));
console.log(Object.hasOwn(item, 'kind'));
