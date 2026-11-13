const item = { b: 'B', 1: 'one', a: 'A' };
Object.defineProperty(item, 'hidden', { value: 'H', enumerable: false });
item.c = 'C';
console.log(JSON.stringify(Object.values(item)));
console.log(JSON.stringify(Object.entries(item)));
console.log(JSON.stringify(Object.getOwnPropertyNames(item)));
