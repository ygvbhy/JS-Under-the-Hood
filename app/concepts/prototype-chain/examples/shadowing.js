const base = { color: 'red' };
const item = Object.create(base);
console.log(item.color);
item.color = 'blue';
console.log(item.color);
console.log(base.color);
console.log(Object.hasOwn(item, 'color'));
delete item.color;
console.log(item.color);
