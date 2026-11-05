var base = Promise.resolve(1);
var branchA = base.then(function (v) { return v + 10; });
var branchB = base.then(function (v) { return v + 20; });
var chained = base
  .then(function (v) { return v + 10; })
  .then(function (v) { return v + 20; });
console.log(branchA === branchB, branchA === base);
Promise.all([branchA, branchB, chained]).then(function (values) {
  console.log(JSON.stringify(values));
});
