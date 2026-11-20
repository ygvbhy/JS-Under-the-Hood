const show = (f) => JSON.stringify(f.name);
const o = {
  prop: () => {},
  method() {},
  get size() {
    return 1;
  },
  set size(v) {},
  ['item' + 1]: function () {},
  1.50: () => {},
};
console.log(show(o.prop), show(o.method));
const desc = Object.getOwnPropertyDescriptor(o, 'size');
console.log(show(desc.get), show(desc.set), o.size);
console.log(show(o.item1), show(o[1.5]));
