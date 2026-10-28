const item = {};
Object.defineProperty(item, 'code', { value: 'A1', enumerable: true });
item.code = 'B2';
console.log(item.code);
console.log(delete item.code);
console.log(item.code);
