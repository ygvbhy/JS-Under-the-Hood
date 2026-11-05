var price = {
  amount: 1200,
  currency: 'KRW',
  toJSON: function (key) {
    return this.amount + ' ' + this.currency + ' (' + key + ')';
  }
};
console.log(JSON.stringify({ total: price }));
console.log(JSON.stringify([price]));
console.log(JSON.stringify(price));
var hidden = { toJSON: function () { return undefined; } };
console.log(JSON.stringify({ a: 1, b: hidden }));
