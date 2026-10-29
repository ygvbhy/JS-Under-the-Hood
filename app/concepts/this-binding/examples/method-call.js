const book = {
  title: 'JS',
  getTitle() {
    return this.title;
  },
};
const other = { title: 'CSS', getTitle: book.getTitle };
console.log(book.getTitle());
console.log(other.getTitle());
console.log(other.getTitle === book.getTitle);
