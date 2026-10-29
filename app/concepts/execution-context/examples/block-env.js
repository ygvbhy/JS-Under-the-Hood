let x = 'global';
function test() {
  let x = 'function';
  {
    let x = 'block';
    var y = 'var';
    console.log(x);
  }
  console.log(x);
  console.log(y);
}
test();
console.log(x);
