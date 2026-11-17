function loose(a) {
  a = 2;
  var read = arguments[0];
  arguments[0] = 9;
  return read + ' ' + a;
}
function tight(a) {
  'use strict';
  a = 2;
  var read = arguments[0];
  arguments[0] = 9;
  return read + ' ' + a;
}
console.log(loose(1));
console.log(tight(1));
