const base = {};
Object.defineProperty(base, 'id', { value: 1, writable: false });
const item = Object.create(base);
item.id = 2;
console.log(item.id);
console.log(Object.hasOwn(item, 'id'));
Object.defineProperty(item, 'id', { value: 2, writable: true });
console.log(item.id);
console.log(base.id);
