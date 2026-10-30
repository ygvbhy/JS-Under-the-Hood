function makeCounter() {
  let count = 0;
  return {
    increment() {
      count += 1;
    },
    get() {
      return count;
    },
  };
}
const counter = makeCounter();
counter.increment();
counter.increment();
console.log(counter.get());
