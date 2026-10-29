function Book(title) {
  this.title = title;
}
Book.prototype.kind = 'book';
const a = new Book('JS');
console.log(Object.getPrototypeOf(a) === Book.prototype);
console.log(Object.getPrototypeOf(Book) === Book.prototype);
console.log(Object.getPrototypeOf(Book) === Function.prototype);
console.log(a.kind);
console.log(a.prototype);
console.log(Book.prototype.constructor === Book);
