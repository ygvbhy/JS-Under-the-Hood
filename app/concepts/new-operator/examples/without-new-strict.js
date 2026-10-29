'use strict';
function Book(title) {
  this.title = title;
}
try {
  Book('JS');
} catch (e) {
  console.log(e.name);
}
console.log(typeof title);
