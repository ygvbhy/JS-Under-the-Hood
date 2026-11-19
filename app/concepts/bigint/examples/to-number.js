const big = 2n ** 63n;
const n = Number(big);
console.log(typeof n, String(n));
console.log(BigInt(n) === big, String(BigInt(n)), String(n) === String(big));
console.log(String(Number(10n ** 400n)), String(Number(-(10n ** 400n))));
