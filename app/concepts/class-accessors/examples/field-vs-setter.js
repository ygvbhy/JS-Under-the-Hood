let fieldCalls = 0;
class E {
  v = 1;
  set v(x) {
    fieldCalls++;
  }
  get v() {
    return 'getter';
  }
}
let ctorCalls = 0;
class F {
  constructor() {
    this.v = 1;
  }
  set v(x) {
    ctorCalls++;
  }
}
const e = new E();
const f = new F();
console.log(fieldCalls, Object.hasOwn(e, 'v'), e.v);
console.log(ctorCalls, Object.hasOwn(f, 'v'), f.v);
