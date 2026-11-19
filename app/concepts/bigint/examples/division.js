function attempt(fn) {
  try {
    const v = fn();
    return typeof v + ':' + String(v);
  } catch (e) {
    return e.name;
  }
}
console.log(String(-5n % 3n), String(5n % -3n), String(-5n % -3n));
console.log(attempt(() => 1n / 0n), attempt(() => 1n % 0n), attempt(() => 2n ** -1n));
console.log(attempt(() => 0n ** 0n), attempt(() => 5n / 2n), String(1 / 0));
