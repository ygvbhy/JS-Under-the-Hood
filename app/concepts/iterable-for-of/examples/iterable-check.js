var arrayLike = { 0: 'a', 1: 'b', length: 2 };
function argsIterator() {
  return typeof arguments[Symbol.iterator];
}
console.log(typeof [][Symbol.iterator], typeof 'hi'[Symbol.iterator], typeof {}[Symbol.iterator]);
console.log(typeof arrayLike[Symbol.iterator], argsIterator());
console.log(JSON.stringify(Array.from(arrayLike)), Array.prototype[Symbol.iterator] === Array.prototype.values);
