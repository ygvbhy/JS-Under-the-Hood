var it = 'x1y2'.matchAll(/[0-9]/g);
for (var m of it) {
  console.log(m[0]);
  break;
}
console.log(typeof it.return);
var rest = [...it].map(function (r) {
  return r[0];
});
console.log(JSON.stringify(rest));
