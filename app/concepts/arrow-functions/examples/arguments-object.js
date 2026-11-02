function count() {
  return arguments.length;
}
function second(a) {
  return a + ' ' + arguments[1];
}
function kind() {
  return Array.isArray(arguments) + ' ' + typeof arguments.join;
}
console.log(count(1, 2, 3), count());
console.log(second('x', 'y'));
console.log(kind());
