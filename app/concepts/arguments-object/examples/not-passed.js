function notPassed(a, b) {
  a = 3;
  b = 5;
  console.log(arguments.length + ' ' + arguments[0] + ' ' + arguments[1] + ' ' + (1 in arguments));
  arguments[1] = 7;
  console.log(b);
}
notPassed(1);
