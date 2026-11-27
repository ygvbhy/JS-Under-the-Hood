const pair = Proxy.revocable({ a: 1 }, {});
const proxy = pair.proxy;
console.log(proxy.a);
pair.revoke();
console.log(proxy === pair.proxy, proxy === null, typeof proxy);
try {
  console.log(proxy.a);
} catch (e) {
  console.log(e.constructor.name);
}
try {
  console.log('a' in proxy);
} catch (e) {
  console.log(e.constructor.name);
}
console.log(pair.revoke());
