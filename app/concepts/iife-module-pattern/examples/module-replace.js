var Counter = (function () {
  var count = 0;
  return { increase: function () { count++; return count; } };
}());
var original = Counter.increase;
Counter.increase = function () { return 999; };
console.log(Counter.increase(), original());
var Frozen = Object.freeze((function () {
  var n = 0;
  return { increase: function () { n++; return n; } };
}()));
Frozen.increase = function () { return 999; };
console.log(Frozen.increase());
