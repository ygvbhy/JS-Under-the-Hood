var nums = [3, 1, 2];
var more = [0, ...nums, 4];
console.log(JSON.stringify(more), more.length);
console.log(Math.max(...nums), Math.max(nums));
var base = { a: 1, b: 2 };
var over = { ...base, b: 20 };
var under = { b: 20, ...base };
console.log(JSON.stringify(over), JSON.stringify(under));
