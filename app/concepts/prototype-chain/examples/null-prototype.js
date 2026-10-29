const dict = Object.create(null);
dict.title = 'JS';
console.log(Object.getPrototypeOf(dict));
console.log('toString' in dict);
console.log(typeof dict.hasOwnProperty);
console.log(Object.hasOwn(dict, 'title'));
const plain = Object.create(Object.prototype);
console.log(Object.getPrototypeOf(plain) === Object.prototype);
