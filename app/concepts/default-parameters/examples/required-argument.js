function required(name) {
  throw new TypeError(name + ' 인수가 필요합니다');
}
function greet(name = required('name')) {
  return 'hi ' + name;
}
try {
  greet();
} catch (e) {
  console.log(e.name, e.message);
}
console.log(greet('kim'));
console.log(greet(null));
