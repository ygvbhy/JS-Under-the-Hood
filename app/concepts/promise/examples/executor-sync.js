var order = [];
var done = new Promise(function (resolve, reject) {
  order.push('executor');
  resolve('first');
  resolve('second');
  reject(new Error('ignored'));
  order.push('after resolve');
});
done.then(function (value) {
  order.push('then ' + value);
  console.log(JSON.stringify(order));
});
order.push('sync end');
console.log(JSON.stringify(order));
