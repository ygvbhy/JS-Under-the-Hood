function first() {
  console.log('first start');
  second();
  console.log('first end');
}
function second() {
  console.log('second start');
  console.log('second end');
}
first();
console.log('global end');
