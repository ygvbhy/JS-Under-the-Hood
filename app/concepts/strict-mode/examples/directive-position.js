function first() {
  'use strict';
  try {
    firstName = 1;
    return 'no error';
  } catch (e) {
    return e.name;
  }
}
function second() {
  var x = 1;
  'use strict';
  try {
    secondName = 1;
    return 'no error';
  } catch (e) {
    return e.name;
  }
}
function third() {
  'note';
  'use strict';
  try {
    thirdName = 1;
    return 'no error';
  } catch (e) {
    return e.name;
  }
}
console.log('first', first());
console.log('second', second());
console.log('third', third());
