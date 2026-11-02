function hasA(s) {
  return /a/g.test(s);
}
console.log(hasA('a'), hasA('a'), hasA('a'));
var shared = /a/g;
function hasAShared(s) {
  return shared.test(s);
}
console.log(hasAShared('a'), hasAShared('a'), hasAShared('a'));
function make() {
  return /a/g;
}
console.log(make() === make());
