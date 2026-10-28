const item = { price: 100 };
console.log(JSON.stringify(Object.getOwnPropertyDescriptor(item, 'price')));
Object.defineProperty(item, 'code', { value: 'A1' });
console.log(JSON.stringify(Object.getOwnPropertyDescriptor(item, 'code')));
console.log(JSON.stringify(item));
