const book = {
  whoAmI() {
    return this === book ? 'book' : this === globalThis ? 'globalThis' : String(this);
  },
};
const whoAmI = book.whoAmI;
console.log(book.whoAmI());
console.log(whoAmI());
