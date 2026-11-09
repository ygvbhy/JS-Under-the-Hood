async function run() {
  const values = [Promise.resolve(1), 2, Promise.resolve(3)];
  for (const v of values) {
    console.log(v instanceof Promise);
  }
  for await (const v of values) {
    console.log(v);
  }
}
run();
