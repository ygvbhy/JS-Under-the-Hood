let calls = 0;
const readonly = new Proxy({}, {
  set() {
    calls += 1;
    return false;
  },
});
readonly.x = 1;
console.log(calls, readonly.x);
console.log(Reflect.set(readonly, 'x', 1));
function strictAssign() {
  'use strict';
  try {
    readonly.x = 1;
    console.log('assigned');
  } catch (e) {
    console.log(e.constructor.name);
  }
}
strictAssign();
const frozen = Object.freeze({});
console.log(Reflect.defineProperty(frozen, 'x', { value: 1 }));
try {
  Object.defineProperty(frozen, 'x', { value: 1 });
  console.log('defined');
} catch (e) {
  console.log(e.constructor.name);
}
