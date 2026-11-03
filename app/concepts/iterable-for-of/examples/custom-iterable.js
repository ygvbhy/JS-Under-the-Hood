var countdown = {
  [Symbol.iterator]() {
    var left = 3;
    return {
      next() {
        console.log('next');
        return left > 0 ? { value: left--, done: false } : { value: undefined, done: true };
      },
      return() {
        console.log('return');
        return { done: true };
      },
    };
  },
};
for (var n of countdown) {
  console.log(n);
  if (n === 2) break;
}
