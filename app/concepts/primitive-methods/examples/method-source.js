const str = 'abc';
console.log(Object.hasOwn(String.prototype, 'toUpperCase'));
console.log(str.toUpperCase === String.prototype.toUpperCase);
console.log(Object.getPrototypeOf(str) === String.prototype);
console.log(Object.hasOwn(str, 'toUpperCase'));
