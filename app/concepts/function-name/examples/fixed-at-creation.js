const show = (f) => JSON.stringify(f.name);
function original() {}
const copy = original;
console.log(show(copy));
const named = function inner() {};
console.log(show(named));
let a, b;
a = b = function () {};
console.log(show(a), show(b));
const made = new Function('return 1');
console.log(show(made));
