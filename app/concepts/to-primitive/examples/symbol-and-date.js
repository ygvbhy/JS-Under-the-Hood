var log = [];
var priced = {
  [Symbol.toPrimitive](hint) {
    return hint;
  },
  valueOf() {
    log.push('valueOf');
    return 1;
  },
};
console.log(priced + '', log.length);
var d = new Date(0);
console.log(typeof (d + 1), d - 1);
