function attempt(digits) {
  try {
    return (1.5).toFixed(digits);
  } catch (e) {
    return e.name;
  }
}
console.log(attempt(100).length, attempt(101), attempt(-1));
console.log((1e21).toFixed(2), (1.5e20).toFixed(2));
console.log(NaN.toFixed(2), Infinity.toFixed(2));
try {
  NaN.toFixed(101);
} catch (e) {
  console.log(e.name);
}
console.log(NaN.toPrecision(0));
