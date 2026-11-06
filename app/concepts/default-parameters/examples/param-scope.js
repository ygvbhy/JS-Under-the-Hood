var x = 'outer';
function read(get = function () { return x; }) {
  var x = 'body';
  return get() + ' ' + x;
}
console.log(read());
