const errorToString = Error.prototype.toString;
console.log(errorToString.call({ name: 'Custom', message: 'm' }));
console.log(errorToString.call({ message: 'm' }));
console.log(errorToString.call({ name: null, message: 'm' }));
console.log(errorToString.call({ name: '', message: 'm' }));
console.log(errorToString.call({ name: 'N', message: '' }));
console.log(errorToString.call({}));
console.log(String(new Error()));
