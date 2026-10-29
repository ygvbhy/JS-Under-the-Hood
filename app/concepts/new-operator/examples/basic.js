function Book(title, price) {
  this.title = title;
  this.price = price;
}
const a = new Book('JS', 30);
const b = new Book('CSS', 20);
console.log(JSON.stringify(a));
console.log(JSON.stringify(b));
console.log(a === b);
