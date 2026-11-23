var calls = [];
var found = [3, 15, 7, 40].find((x) => {
  calls.push(x);
  return x > 10;
});
console.log(found, JSON.stringify(calls));
calls = [];
var all = [3, 15, 7, 40].filter((x) => {
  calls.push(x);
  return x > 10;
});
console.log(JSON.stringify(all), JSON.stringify(calls));
var none = [1, 2];
console.log(none.find((x) => x > 5), JSON.stringify(none.filter((x) => x > 5)), none.findIndex((x) => x > 5));
