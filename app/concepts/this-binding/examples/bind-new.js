function Book(title) {
  this.title = title;
}
const kim = { name: 'Kim' };
const BoundBook = Book.bind(kim, 'JS');
const book = new BoundBook();
console.log(JSON.stringify(book));
console.log(JSON.stringify(kim));
console.log(book instanceof Book);
