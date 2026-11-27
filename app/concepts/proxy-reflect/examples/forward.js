const target = { a: 1 };
const proxy = new Proxy(target, {});
proxy.b = 2;
console.log(proxy.a, target.b);
console.log('b' in target, Object.keys(proxy).join());
console.log(proxy === target);
