var calls = [];
function num(name, value) {
  return { valueOf: function () { calls.push(name); return value; } };
}
console.log(Math.max(-1, null), Math.max(1, undefined), Math.max('10', '9'), typeof Math.max(1, '5'));
console.log(Math.max(num('a', NaN), num('b', 1), num('c', 2)), calls.join(','));
calls = [];
var stop = { valueOf: function () { calls.push('t'); throw new RangeError('stop'); } };
try {
  Math.max(num('a', 1), stop, num('c', 3));
} catch (e) {
  console.log(e.name, calls.join(','));
}
try {
  Math.max(NaN, 1n);
} catch (e) {
  console.log(e.name);
}
