function afterDelete(a) {
  a = 2;
  var before = arguments[0];
  delete arguments[0];
  arguments[0] = 9;
  return before + ' ' + a + ' ' + arguments[0];
}
function afterReadonly(a) {
  a = 2;
  Object.defineProperty(arguments, '0', { writable: false });
  a = 3;
  return a + ' ' + arguments[0];
}
console.log(afterDelete(1));
console.log(afterReadonly(1));
