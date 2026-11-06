function keep() {
  var x = 1;
  try {
    return x;
  } finally {
    x = 2;
    console.log('finally x = ' + x);
  }
}
console.log(keep());
