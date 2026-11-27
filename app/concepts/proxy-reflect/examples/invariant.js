const frozen = Object.freeze({ level: 1 });
const liar = new Proxy(frozen, {
  get() {
    return 2;
  },
});
try {
  console.log(liar.level);
} catch (e) {
  console.log(e.constructor.name);
}
console.log(liar.other);
const honest = new Proxy(frozen, {
  get(target, key) {
    return key === 'level' ? 1 : 2;
  },
});
console.log(honest.level);
const writableOnly = Object.defineProperty({}, 'level', { value: 1, writable: true, configurable: false });
const configurableOnly = Object.defineProperty({}, 'level', { value: 1, writable: false, configurable: true });
const alwaysTwo = {
  get() {
    return 2;
  },
};
console.log(new Proxy(writableOnly, alwaysTwo).level, new Proxy(configurableOnly, alwaysTwo).level);
