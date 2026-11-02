var point = { x: 1, y: 2, [Symbol.toStringTag]: 'Point' };
console.log(Object.prototype.toString.call(point), String(point));
var price = {
  [Symbol.toPrimitive](hint) {
    return hint === 'number' ? 100 : 'price:' + hint;
  },
};
console.log(+price, `${price}`, price + '');
console.log(typeof Symbol.iterator, Symbol.iterator.description);
