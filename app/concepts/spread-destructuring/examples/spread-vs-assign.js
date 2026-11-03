var calls = [];
var source = {
  get value() { calls.push('get'); return 1; }
};
var target = {
  set value(v) { calls.push('set ' + v); }
};
Object.assign(target, source);
console.log(calls.join(','), typeof Object.getOwnPropertyDescriptor(target, 'value').set);
calls = [];
var copy = { ...source };
var desc = Object.getOwnPropertyDescriptor(copy, 'value');
console.log(calls.join(','), desc.value, typeof desc.get);
