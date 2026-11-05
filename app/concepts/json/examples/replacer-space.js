var order = { id: 7, item: 'pen', qty: 2, buyer: { id: 3, name: 'park' } };
var keys = [];
var doubled = JSON.stringify(order, function (key, value) {
  keys.push(key);
  return typeof value === 'number' ? value * 2 : value;
});
console.log(doubled);
console.log(JSON.stringify(keys));
console.log(JSON.stringify(order, ['id', 'buyer']));
var pretty = JSON.stringify({ a: 1, b: [2] }, null, '--');
console.log(JSON.stringify(pretty.split('\n')));
