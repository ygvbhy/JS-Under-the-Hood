let calls = 0;
class A {
  constructor() {
    this._v = 1;
  }
  get v() {
    return this._v;
  }
  set v(x) {
    calls++;
    this._v = x;
  }
}
class D extends A {
  v = 2;
}
const d = new D();
console.log(calls, Object.hasOwn(d, 'v'), d.v, d._v);
d.v = 3;
console.log(calls, d.v, d._v);
