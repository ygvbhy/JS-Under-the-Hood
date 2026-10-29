function Book(title) {
  this.title = title;
}
const a = new Book('JS');
console.log(a instanceof Book);
console.log(a instanceof Object);
Book.prototype = { kind: 'book' };
console.log(a instanceof Book);
const b = new Book('CSS');
console.log(b instanceof Book);
const c = Object.create(Book.prototype);
console.log(c instanceof Book);
console.log(JSON.stringify(c));
