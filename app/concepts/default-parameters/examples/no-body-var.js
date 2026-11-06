function demo(x, get = function () { return x; }) {
  x = 'body';
  console.log(x, get());
}
demo('arg');
