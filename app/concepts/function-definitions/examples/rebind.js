function d() {}
d = 1;
console.log(typeof d);

var f = function g() {
  g = 1;
  return typeof g;
};
console.log(f());
console.log(typeof g);

var h = function k() {
  'use strict';
  try {
    k = 1;
  } catch (e) {
    return e.name;
  }
  return typeof k;
};
console.log(h());
