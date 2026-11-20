const show = (f) => JSON.stringify(f.name);
function f() {}
const d = Object.getOwnPropertyDescriptor(f, 'name');
console.log(d.writable, d.enumerable, d.configurable);
f.name = 'z';
console.log(show(f));
function setInStrict() {
  'use strict';
  try {
    f.name = 'z';
  } catch (e) {
    return e.name;
  }
}
console.log(setInStrict());
Object.defineProperty(f, 'name', { value: 'z' });
console.log(show(f), show(f.bind(null)));
delete f.name;
console.log(show(f), Object.hasOwn(f, 'name'));
const anon = (0, () => {});
console.log(show(anon), Object.hasOwn(anon, 'name'));
