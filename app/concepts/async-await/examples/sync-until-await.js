async function work() {
  console.log('a1');
  await null;
  console.log('a2');
  return 'done';
}
var p = work();
console.log('after call');
p.then(function (v) {
  console.log('then ' + v);
});
