let saved = '';
const base = {
  set name(value) {
    saved = value;
  },
};
const item = Object.create(base);
item.name = 'JS';
console.log(saved);
console.log(Object.hasOwn(item, 'name'));
console.log(item.name);
