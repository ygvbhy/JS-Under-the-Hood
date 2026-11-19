function attempt(fn) {
  try {
    const v = fn();
    return typeof v + ':' + String(v);
  } catch (e) {
    return e.name;
  }
}
console.log(String(5n & 3n), String(5n | 3n), String(5n ^ 3n), String(~5n));
console.log(String(-5n >> 1n), String(-5n / 2n));
console.log(String(1n << 31n), 1 << 31, String(1n << 64n));
console.log(attempt(() => 1n >>> 0n), attempt(() => 1n & 1));
console.log(String(BigInt.asUintN(64, -1n)), String(BigInt.asIntN(8, 255n)), String(BigInt.asIntN(8, 128n)));
