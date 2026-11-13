const calls = [];
const result = 'x1y22'.replace(/([0-9]+)/g, function (match, p1, offset, whole) {
  calls.push(match + ':' + p1 + ':' + offset + ':' + whole);
  return '#';
});
console.log(result);
console.log(JSON.stringify(calls));
console.log('ab'.replace('a', function () { return '$&'; }));
console.log('ab'.replace('a', function () { return 7; }));
