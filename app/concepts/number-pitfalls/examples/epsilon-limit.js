function close(a, b) {
  return Math.abs(a - b) < Number.EPSILON;
}
console.log(Number.EPSILON === 2 ** -52);
console.log(1 + Number.EPSILON === 1, 1 + Number.EPSILON / 2 === 1);
console.log(close(0.1 + 0.2, 0.3));
console.log(close(1000.1 + 1000.2, 2000.3));
console.log(Math.abs(1000.1 + 1000.2 - 2000.3));
console.log(close(1e-20, 2e-20));
