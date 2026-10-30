(function countdown(n) {
  console.log(n);
  if (n > 1) countdown(n - 1);
})(2);
console.log(typeof countdown);
