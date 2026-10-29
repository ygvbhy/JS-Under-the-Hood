'use strict';
const book = {
  whoAmI() {
    return this === book ? 'book' : String(this);
  },
};
console.log(book.whoAmI());
console.log((book.whoAmI)());
console.log((0, book.whoAmI)());
