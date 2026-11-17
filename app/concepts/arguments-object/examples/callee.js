function loose() {
  return arguments.callee === loose;
}
function tight() {
  'use strict';
  try {
    return arguments.callee === tight;
  } catch (e) {
    return e.name;
  }
}
console.log(loose());
console.log(tight());
