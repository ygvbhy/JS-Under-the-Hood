'use strict';
const item = {};
Object.defineProperty(item, 'code', { value: 'A1', enumerable: true });
try {
  item.code = 'B2';
} catch (e) {
  console.log(e.name);
}
try {
  delete item.code;
} catch (e) {
  console.log(e.name);
}
console.log(item.code);
