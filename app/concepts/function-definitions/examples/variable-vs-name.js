var add = function sum(x) {
  return x <= 0 ? 0 : x + sum(x - 1);
};
console.log(add(3));
try {
  sum;
} catch (e) {
  console.log(e.name);
}
var keep = add;
add = null;
console.log(keep(3));

var fact = function (x) {
  return x <= 1 ? 1 : x * fact(x - 1);
};
var keepFact = fact;
fact = null;
try {
  console.log(keepFact(3));
} catch (e) {
  console.log(e.name);
}
