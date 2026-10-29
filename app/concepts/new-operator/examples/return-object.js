function Book(title) {
  this.title = title;
  return { title: 'other' };
}
const book = new Book('JS');
console.log(JSON.stringify(book));
