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
class B extends A {
  get v() {
    return this._v * 10;
  }
  trySet() {
    try {
      this.v = 7;
    } catch (e) {
      return e.name;
    }
    return 'no error';
  }
}
const b = new B();
b.v = 5;
console.log(b.v, b._v, Object.hasOwn(b, 'v'));
console.log(typeof Object.getOwnPropertyDescriptor(B.prototype, 'v').set);
console.log(b.trySet());
