function show(n) { return Object.is(n, -0) ? '-0' : String(n); }
var xs = [-1.5, -0.5, -0.4, 0.4, 1.5];
for (var i = 0; i < xs.length; i++) {
  var x = xs[i];
  console.log(show(x), show(Math.floor(x)), show(Math.ceil(x)), show(Math.trunc(x)), show(Math.round(x)));
}
console.log(show(Math.round(-0.4)), show(Math.floor(-0.4 + 0.5)));
