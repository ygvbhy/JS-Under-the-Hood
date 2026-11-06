function plain(a) {
  a = 2;
  return arguments[0];
}
function withDefault(a = 1) {
  a = 2;
  return arguments[0];
}
console.log(plain(0), withDefault(0));
function count(a = 1, b = 2) {
  return arguments.length;
}
console.log(count(), count(5), count(undefined, undefined));
