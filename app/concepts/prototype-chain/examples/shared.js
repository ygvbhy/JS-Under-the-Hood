function Book(title) {
  this.title = title;
}
const a = new Book('JS');
const b = new Book('CSS');
console.log(a.kind);
Book.prototype.kind = 'book';
console.log(a.kind);
console.log(b.kind);
console.log(JSON.stringify(a));
