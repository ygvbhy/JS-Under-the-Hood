function paramName(arguments) {
  return typeof arguments;
}
function declared() {
  function arguments() {}
  return typeof arguments;
}
console.log(paramName(1));
console.log(declared());
