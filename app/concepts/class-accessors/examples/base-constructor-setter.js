class Base {
  constructor() {
    this.v = 1;
  }
}
class Der extends Base {
  label = 'd';
  set v(x) {
    console.log('setter', x, this.label);
  }
}
const der = new Der();
console.log(Object.hasOwn(der, 'v'), der.label);
