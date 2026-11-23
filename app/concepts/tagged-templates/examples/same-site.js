function keep(strings) {
  return strings;
}
var seen = [];
for (var i = 0; i < 3; i++) {
  seen.push(keep`x${i}`);
}
var elsewhere = keep`x${i}`;
console.log(seen[0] === seen[1], seen[1] === seen[2]);
console.log(seen[0] === elsewhere);
function makeTagger() {
  return function () {
    return keep`y`;
  };
}
var f1 = makeTagger();
var f2 = makeTagger();
console.log(f1 === f2, f1() === f2());
