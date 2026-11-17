function twoWay(a) {
  a = 2;
  var fromParam = arguments[0];
  arguments[0] = 9;
  return fromParam + ' ' + a;
}
console.log(twoWay(1));
