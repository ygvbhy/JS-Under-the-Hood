class Counter {
  #count = 0;
  increment() {
    this.#count += 1;
    return this.#count;
  }
}
const counter = new Counter();
const seen = [];
const proxy = new Proxy(counter, {
  get(target, key, receiver) {
    seen.push(String(key));
    return Reflect.get(target, key, receiver);
  },
});
try {
  console.log(proxy.increment());
} catch (e) {
  console.log(e.constructor.name);
}
console.log(seen.join());
console.log(proxy.increment.call(counter), counter.increment());
