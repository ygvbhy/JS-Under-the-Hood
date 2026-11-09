function source(failNext) {
  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      if (failNext) {
        return Promise.reject(new Error('next 실패'));
      }
      return Promise.resolve({ value: 1, done: false });
    },
    return() {
      console.log('return 호출');
      return Promise.resolve({ done: true });
    },
  };
}
async function run() {
  try {
    for await (const v of source(false)) {
      throw new Error('본문 실패');
    }
  } catch (e) {
    console.log(e.message);
  }
  try {
    for await (const v of source(true)) {
      console.log(v);
    }
  } catch (e) {
    console.log(e.message);
  }
}
run();
