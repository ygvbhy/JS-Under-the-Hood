const big = 2n ** 53n;
console.log(typeof big, String(big + 1n));
console.log(big + 1n === big, Number(big + 1n) === Number(big));
console.log(1n == 1, 1n === 1);
try {
  big + 1;
} catch (e) {
  console.log(e.name);
}
console.log(String(7n / 2n), String(-7n / 2n));
