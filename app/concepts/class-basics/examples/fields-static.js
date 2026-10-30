class Item {
  count = 0;
  static total = 0;
  add() { this.count++; Item.total++; }
}
var a = new Item();
var b = new Item();
a.add(); a.add(); b.add();
console.log(a.count, b.count, Item.total);
console.log(JSON.stringify(Object.keys(a)), a.hasOwnProperty('add'), typeof a.total);
