try {
  new Function('function f() {}');
  console.log('compiled');
} catch (e) {
  console.log(e.name);
}
try {
  new Function('function () {}');
  console.log('compiled');
} catch (e) {
  console.log(e.name);
}
console.log(typeof new Function('return function () {};')());
