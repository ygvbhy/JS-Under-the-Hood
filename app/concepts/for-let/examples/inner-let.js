const fns = {};
for (var i = 0; i < 3; i++) {
  let n = i;
  fns[i] = function () { return n; };
}
console.log(fns[0](), fns[1](), fns[2](), i);
