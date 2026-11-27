const date = new Date(0);
const proxy = new Proxy(date, {});
console.log(proxy instanceof Date, proxy.getTime === Date.prototype.getTime);
try {
  console.log(proxy.getTime());
} catch (e) {
  console.log(e.constructor.name);
}
console.log(proxy.getTime.call(date));
const viaReflect = new Proxy(date, {
  get(target, key, receiver) {
    return Reflect.get(target, key, receiver);
  },
});
try {
  console.log(viaReflect.getTime());
} catch (e) {
  console.log(e.constructor.name);
}
const bound = new Proxy(date, {
  get(target, key, receiver) {
    const value = Reflect.get(target, key, receiver);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});
console.log(bound.getTime());
