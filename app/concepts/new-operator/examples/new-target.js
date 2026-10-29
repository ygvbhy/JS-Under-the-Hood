function Book(title) {
  if (new.target === undefined) {
    return new Book(title);
  }
  this.title = title;
}
const a = new Book('JS');
const b = Book('CSS');
console.log(JSON.stringify(a));
console.log(JSON.stringify(b));
