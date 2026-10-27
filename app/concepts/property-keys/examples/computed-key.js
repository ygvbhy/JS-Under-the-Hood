const field = 'color';
const n = 2;
const a = { field: '빨강' };
const b = { [field]: '빨강', ['size' + n]: 'M' };
console.log(JSON.stringify(a));
console.log(JSON.stringify(b));
