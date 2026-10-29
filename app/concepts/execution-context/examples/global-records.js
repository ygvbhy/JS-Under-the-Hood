var count = 1;
let total = 2;
function greet() {}
console.log('count' in globalThis);
console.log('total' in globalThis);
console.log(typeof globalThis.greet);
console.log(total);
