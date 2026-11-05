async function task() {
  await 'not a promise';
  console.log('task after await');
}
task();
Promise.resolve()
  .then(function () {
    console.log('then 1');
  })
  .then(function () {
    console.log('then 2');
  });
console.log('sync');
