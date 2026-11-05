var range = {
  from: 1,
  to: 3,
  *[Symbol.iterator]() {
    for (var i = this.from; i <= this.to; i++) {
      yield i;
    }
  }
};
console.log(JSON.stringify([...range]));
console.log(JSON.stringify([...range]));
var it = range[Symbol.iterator]();
console.log(it[Symbol.iterator]() === it);
console.log(JSON.stringify([...it]));
console.log(JSON.stringify([...it]));
