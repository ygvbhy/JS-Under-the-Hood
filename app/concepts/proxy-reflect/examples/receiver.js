const base = {
  _name: 'base',
  get name() {
    return this._name;
  },
};
console.log(Reflect.get(base, 'name'), Reflect.get(base, 'name', { _name: 'other' }));
const viaReflect = new Proxy(base, {
  get(target, key, receiver) {
    return Reflect.get(target, key, receiver);
  },
});
const viaIndex = new Proxy(base, {
  get(target, key) {
    return target[key];
  },
});
const a = Object.create(viaReflect);
a._name = 'a';
const b = Object.create(viaIndex);
b._name = 'b';
console.log(a.name, b.name);
