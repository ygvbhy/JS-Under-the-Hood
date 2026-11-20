const show = (f) => JSON.stringify(f.name);
const o = {};
o.p = () => {};
o['q'] = function () {};
console.log(show(o.p), show(o.q));
function take(fn) {
  return show(fn);
}
console.log(take(() => {}));
const paren = (function () {});
const comma = (0, function () {});
const either = null || function () {};
console.log(show(paren), show(comma), show(either));
