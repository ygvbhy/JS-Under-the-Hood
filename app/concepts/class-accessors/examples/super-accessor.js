class A {
  constructor() {
    this._v = 1;
  }
  get v() {
    return this._v;
  }
  set v(x) {
    this._v = x;
  }
}
class C extends A {
  get v() {
    return super.v * 10;
  }
  set v(x) {
    super.v = x + 1;
  }
}
const c = new C();
c.v = 4;
console.log(c.v, c._v, Object.hasOwn(c, 'v'));
