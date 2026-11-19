console.log(1n < 1.5, 2n > 1.5, 1n == 1.5);
const big = 9007199254740993n;
console.log(big > 9007199254740992, big == 9007199254740992);
console.log(1n < NaN, 1n >= NaN, 10n ** 400n < Infinity, -(10n ** 400n) > -Infinity);
console.log([1n].includes(1), [1n].includes(1n));
