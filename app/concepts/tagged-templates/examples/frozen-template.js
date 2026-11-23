'use strict';
function keep(strings) {
  return strings;
}
var s = keep`a${1}b`;
console.log(Object.isFrozen(s), Object.isFrozen(s.raw), Array.isArray(s));
try {
  s[0] = 'z';
} catch (e) {
  console.log(e.name);
}
console.log(s[0], Object.keys(s).join(','));
