const fns = {};
for (let i = 0; i < 4; i++) {
  fns[i] = function () { return i; };
  i++;
}
console.log(fns[0](), fns[2]());
