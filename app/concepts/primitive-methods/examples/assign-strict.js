'use strict';
const str = 'hello';
try {
  str.custom = 1;
} catch (e) {
  console.log(e.name);
}
console.log(str.custom);
