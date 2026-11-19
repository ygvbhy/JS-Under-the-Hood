function attempt(fn) {
  try {
    const v = fn();
    return typeof v + ':' + String(v);
  } catch (e) {
    return e.name;
  }
}
console.log(attempt(() => BigInt(1.5)), attempt(() => BigInt(NaN)), attempt(() => BigInt(Infinity)));
console.log(attempt(() => BigInt(undefined)), attempt(() => BigInt(null)), attempt(() => BigInt(true)));
console.log(attempt(() => BigInt(' 12 ')), attempt(() => BigInt('')), attempt(() => BigInt('0x10')), attempt(() => BigInt('-0x10')));
console.log(attempt(() => BigInt('1e3')), Number('1e3'), attempt(() => BigInt('1.5')), attempt(() => BigInt('1_000')));
console.log(attempt(() => BigInt.asIntN(8, 255)), attempt(() => BigInt.asIntN(8, 255n)), attempt(() => BigInt(255)));
