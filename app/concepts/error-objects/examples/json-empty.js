const e = new Error('bad');
console.log(e.message, JSON.stringify(e));
const d = Object.getOwnPropertyDescriptor(e, 'message');
console.log(d.value, d.enumerable);
console.log(Object.keys(e).length);
console.log(JSON.stringify({ name: e.name, message: e.message }));
