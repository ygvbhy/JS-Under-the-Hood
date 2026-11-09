function* syncGen() {
  yield Promise.resolve('값');
}
async function* asyncGen() {
  yield Promise.resolve('값');
}
console.log(syncGen().next().value instanceof Promise);
asyncGen().next().then((r) => console.log(JSON.stringify(r)));
