const prices = { apple: 1000 };
const proxy = new Proxy(prices, {
  get(target, key, receiver) {
    if (key in target) return Reflect.get(target, key, receiver);
    return -1;
  },
});
console.log(proxy.apple, proxy.banana, prices.banana);
console.log('banana' in proxy);
