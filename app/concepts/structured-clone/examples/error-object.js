const bad = new TypeError('bad');
bad.code = 5;
const c1 = structuredClone(bad);
console.log(c1 instanceof TypeError, c1.message, 'code' in c1);

class NamedTypeError extends TypeError {
  constructor(m) {
    super(m);
    this.name = 'NamedTypeError';
  }
}
const c2 = structuredClone(new NamedTypeError('x'));
console.log(c2 instanceof TypeError, c2.name);

const plain = new Error('m');
plain.name = 'TypeError';
const c3 = structuredClone(plain);
console.log(c3 instanceof TypeError, c3.name);
