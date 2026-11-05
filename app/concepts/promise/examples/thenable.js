var thenable = {
  then: function (onFulfilled) {
    console.log('thenable.then called');
    onFulfilled('from thenable');
  }
};
var p = Promise.resolve(thenable);
console.log('sync end', p === thenable);
p.then(function (v) {
  console.log('got', v);
});
