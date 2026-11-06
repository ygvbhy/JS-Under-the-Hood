const big = 2 ** 53;
console.log(Number.isInteger(big), Number.isSafeInteger(big));
console.log(Number.isSafeInteger(big - 1), Number.isSafeInteger(1.5));
console.log(Number.isInteger(5.0), Number.isInteger('5'), Number.isSafeInteger('5'));
console.log(Number.isInteger(1.0000000000000001));
