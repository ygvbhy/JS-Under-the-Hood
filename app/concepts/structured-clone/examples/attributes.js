const sym = Symbol('id');
let calls = 0;
const source = { visible: 1, [sym]: 2 };
Object.defineProperty(source, 'hidden', { value: 3, enumerable: false });
Object.defineProperty(source, 'acc', {
  get() {
    calls++;
    return 7;
  },
  enumerable: true,
});
const c = structuredClone(source);
console.log('hidden' in c, Object.getOwnPropertySymbols(c).length);
console.log(JSON.stringify(Object.getOwnPropertyDescriptor(c, 'acc')), calls);
const frozen = Object.freeze({ a: 1 });
const fc = structuredClone(frozen);
console.log(Object.isFrozen(fc), Object.getOwnPropertyDescriptor(fc, 'a').writable);
