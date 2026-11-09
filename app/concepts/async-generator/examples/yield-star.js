async function* inner() {
  yield 'i1';
  return '안쪽 반환값';
}
const raw = {
  [Symbol.asyncIterator]() {
    let sent = false;
    return {
      next() {
        if (sent) {
          return Promise.resolve({ done: true });
        }
        sent = true;
        return Promise.resolve({ value: Promise.resolve('p'), done: false });
      },
    };
  },
};
async function* outer() {
  const r = yield* inner();
  console.log(r);
  yield* [Promise.resolve('s1'), 's2'];
  yield* raw;
}
async function run() {
  for await (const v of outer()) {
    console.log(v instanceof Promise ? '프로미스' : v);
  }
}
run();
