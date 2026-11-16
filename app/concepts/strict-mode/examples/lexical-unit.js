function helper() {
  try {
    helperName = 1;
    return 'no error';
  } catch (e) {
    return e.name;
  }
}
function outer() {
  'use strict';
  function inner() {
    try {
      innerName = 1;
      return 'no error';
    } catch (e) {
      return e.name;
    }
  }
  return ['inner ' + inner(), 'helper ' + helper()];
}
var results = outer();
console.log(results[0]);
console.log(results[1]);
