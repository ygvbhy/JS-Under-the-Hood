function makeCounter() {
  let count = 0;
  function increment() {
    count += 1;
    return count;
  }
  return increment;
}
const next = makeCounter();
console.log(next());
console.log(next());
console.log(typeof count);
