function sloppy() {
  return this === globalThis;
}
function strict() {
  'use strict';
  return this;
}
console.log(sloppy());
console.log(strict());
