const x = NaN;
console.log(x === x, x == x);
console.log(Number.isNaN(x), Object.is(x, NaN));
console.log(0 === -0, Object.is(0, -0));
