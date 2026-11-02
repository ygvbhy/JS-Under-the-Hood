var x = Symbol.for('app.id');
var y = Symbol.for('app.id');
console.log(x === y, x === Symbol('app.id'));
console.log(Symbol.keyFor(x), x.description);
console.log(Symbol.keyFor(Symbol('app.id')), Symbol.keyFor(Symbol.iterator));
