class Temp {
  constructor(c) {
    this._c = c;
  }
  get f() {
    return this._c * 9 / 5 + 32;
  }
  set f(v) {
    this._c = (v - 32) * 5 / 9;
  }
}
const a = new Temp(100);
const b = new Temp(20);
console.log(a.f);
a.f = 32;
console.log(a._c, b._c);
console.log(Object.hasOwn(a, 'f'), 'f' in a, JSON.stringify(Object.keys(a)));
const d = Object.getOwnPropertyDescriptor(Temp.prototype, 'f');
console.log(Object.hasOwn(Temp.prototype, 'f'), typeof d.get, typeof d.set, d.enumerable);
