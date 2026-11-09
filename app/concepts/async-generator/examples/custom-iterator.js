const range = {
  [Symbol.asyncIterator]() {
    console.log('asyncIterator');
    let n = 0;
    return {
      next() {
        n += 1;
        return Promise.resolve({ value: n, done: n > 2 });
      },
    };
  },
  [Symbol.iterator]() {
    console.log('iterator');
    return [][Symbol.iterator]();
  },
};
async function run() {
  for await (const v of range) {
    console.log(v);
  }
  const notIterable = {};
  try {
    for await (const v of notIterable) {
      console.log(v);
    }
  } catch (e) {
    console.log(e.name);
  }
  const badNext = {
    [Symbol.asyncIterator]() {
      return { next: () => 1 };
    },
  };
  try {
    for await (const v of badNext) {
      console.log(v);
    }
  } catch (e) {
    console.log(e.name);
  }
}
run();
