function outer(p) {
  var v = 'v';
  let l = 'l';
  function inner() {
    return p + v + l;
  }
  return inner();
}
console.log(outer('p'));
