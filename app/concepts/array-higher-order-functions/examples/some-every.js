var log = [];
var any = [1, 2, 3, 4].some((x) => {
  log.push(x);
  return x > 1;
});
console.log(any, JSON.stringify(log));
log = [];
var all = [1, 2, 3, 4].every((x) => {
  log.push(x);
  return x < 2;
});
console.log(all, JSON.stringify(log));
console.log([].some((x) => true), [].every((x) => false));
