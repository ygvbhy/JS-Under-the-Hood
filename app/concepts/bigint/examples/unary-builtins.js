function attempt(fn) {
  try {
    const v = fn();
    return typeof v + ':' + String(v);
  } catch (e) {
    return e.name;
  }
}
console.log(attempt(() => -1n), attempt(() => ~1n));
console.log(attempt(() => +1n));
console.log(attempt(() => Math.max(1n, 2n)), attempt(() => isNaN(1n)));
console.log(Number.isInteger(1n), Number.isNaN(1n), parseInt(1n));
