function getName() {
  return '민지';
}
const fn = getName;
const result = getName();
console.log(typeof fn, typeof result);
console.log(fn === getName, fn());
