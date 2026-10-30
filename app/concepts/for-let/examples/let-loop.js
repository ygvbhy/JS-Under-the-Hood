const fns = {};
for (let i = 0; i < 3; i++) {
  fns[i] = function () { return i; };
}
console.log(fns[0](), fns[1](), fns[2]());
