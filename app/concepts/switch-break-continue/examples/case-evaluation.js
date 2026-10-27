let count = 0;
function pick(value) {
  count++;
  return value;
}
switch ('b') {
  case pick('a'):
    console.log('a');
  case pick('b'):
    console.log('b');
  case pick('c'):
    console.log('c');
}
console.log(count);
