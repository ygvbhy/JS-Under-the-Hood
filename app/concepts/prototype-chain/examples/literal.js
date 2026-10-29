const book = { title: 'JS' };
console.log(Object.getPrototypeOf(book) === Object.prototype);
console.log(typeof book.toString);
console.log(Object.hasOwn(book, 'toString'));
console.log(Object.getPrototypeOf(Object.prototype));
console.log(book.price);
