const original = {
  d: new Date(0),
  m: new Map([['k', 1]]),
  s: new Set([1]),
  u: undefined,
  n: NaN,
  big: 10n,
};
const c = structuredClone(original);
console.log(c.d instanceof Date, c.d === original.d, c.d.getTime());
console.log(c.m instanceof Map, c.m.get('k'), c.s.has(1));
console.log('u' in c, Number.isNaN(c.n), typeof c.big);
c.m.set('x', 2);
console.log(original.m.size);
