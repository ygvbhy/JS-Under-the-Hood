class Base {
  constructor() {
    this.text = this.describe();
  }
  describe() {
    return 'base';
  }
}
class Derived extends Base {
  label = 'derived';
  describe() {
    return 'label=' + this.label;
  }
}
const d = new Derived();
console.log(d.text);
console.log(d.label);
