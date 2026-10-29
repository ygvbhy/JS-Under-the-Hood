'use strict';
const book = {
  whoAmI() {
    return this === book ? 'book' : String(this);
  },
};
const whoAmI = book.whoAmI;
console.log(book.whoAmI());
console.log(whoAmI());
