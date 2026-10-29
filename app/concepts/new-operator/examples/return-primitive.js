function Book(title) {
  this.title = title;
  return 100;
}
const book = new Book('JS');
console.log(JSON.stringify(book));
