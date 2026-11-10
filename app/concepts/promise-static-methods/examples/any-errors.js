var rejectOne, rejectTwo;
var one = new Promise(function (resolve, reject) { rejectOne = reject; });
var two = new Promise(function (resolve, reject) { rejectTwo = reject; });
Promise.any([one, two]).catch(function (e) {
  console.log(e.name, JSON.stringify(e.errors.map(function (x) { return x.message; })));
});
rejectTwo(new Error('two'));
rejectOne(new Error('one'));
