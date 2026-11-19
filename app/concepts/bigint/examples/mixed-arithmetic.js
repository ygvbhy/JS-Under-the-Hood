function attempt(fn) {
  try {
    const v = fn();
    return typeof v + ':' + String(v);
  } catch (e) {
    return e.name;
  }
}
console.log(attempt(() => 1n * true), attempt(() => 1n + undefined));
console.log(attempt(() => 1n + '1'), attempt(() => '1' + 1n));
console.log(attempt(() => Number(1n) + 1), attempt(() => 1n + BigInt(1)));
