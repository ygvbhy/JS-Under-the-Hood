var nums = [1, 2];
var seen = [];
nums.forEach((x) => {
  seen.push(x);
  if (x < 3) nums.push(x + 2);
});
console.log(JSON.stringify(seen), JSON.stringify(nums));
