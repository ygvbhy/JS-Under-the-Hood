var log = '';
function val(name, n) {
  log += name;
  return { valueOf: function () { log += name.toUpperCase(); return n; } };
}
console.log(val('a', 1) > val('b', 2), log);
log = '';
console.log(val('a', 1) <= val('b', 2), log);
