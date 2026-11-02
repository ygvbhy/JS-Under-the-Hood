function Box(label) {
  this.label = label;
  this.read = () => this.label + ' ' + arguments.length + ' ' + (new.target === Box);
  this.plain = function () { return this.label + ' ' + arguments.length + ' ' + (new.target === Box); };
}
var box = new Box('A', 'extra');
var other = { label: 'B', read: box.read, plain: box.plain };
console.log(box.read(1, 2, 3));
console.log(other.read());
console.log(other.plain(1, 2, 3));
var topLevel = () => typeof arguments;
console.log(topLevel(1, 2));
