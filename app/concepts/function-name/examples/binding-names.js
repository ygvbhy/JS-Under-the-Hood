const show = (f) => JSON.stringify(f.name);
function decl() {}
var v = function () {};
let arrow = () => {};
let later;
later = function () {};
function withDefault(cb = function () {}) {
  return show(cb);
}
console.log(show(decl), show(v), show(arrow), show(later), withDefault());
