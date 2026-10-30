function makeAdder(amount) {
  return function (value) {
    return value + amount;
  };
}
const add2 = makeAdder(2);
const add10 = makeAdder(10);
console.log(add2(1));
console.log(add10(1));
console.log(add2(5));
