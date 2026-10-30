function makeCounter() {
  let count = 0;
  return function () {
    count += 1;
    return count;
  };
}
const first = makeCounter();
const second = makeCounter();
console.log(first());
console.log(first());
console.log(second());
