function demo(x, get = function () { return x; }) {
  var x;
  console.log(x);
  x = 'body';
  console.log(x, get());
}
demo('arg');
