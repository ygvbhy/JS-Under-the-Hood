var a = (function () { return 1; })();
var b = (function () { return 2; }());
var c = !function () { return 3; }();
var d = void function () { return 4; }();
var e = function () { return 5; }();
console.log(a, b, c, d, e);
