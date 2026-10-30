function outer() {
  const a = 'a';
  return function () {
    const b = 'b';
    return function () {
      return a + b;
    };
  };
}
const middle = outer();
const inner = middle();
console.log(inner());
