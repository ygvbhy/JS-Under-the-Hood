async function* gen() {
  yield 1;
}
const it = gen();
console.log(Object.prototype.toString.call(it));
console.log(it[Symbol.asyncIterator]() === it);
console.log(typeof it.next, typeof it[Symbol.iterator]);
console.log(typeof gen.prototype);
try {
  new gen();
} catch (e) {
  console.log('new:', e.name);
}
try {
  for (const v of it) {
    console.log(v);
  }
} catch (e) {
  console.log('for...of:', e.name);
}
