function Book(title) {
  this.title = title;
  return null;
}
const book = new Book('JS');
console.log(JSON.stringify(book));
console.log(typeof null);
