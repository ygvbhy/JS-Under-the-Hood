var sum = (...nums) => {
  var total = 0;
  for (var i = 0; i < nums.length; i++) total += nums[i];
  return total;
};
function tag(label, ...rest) {
  return label + ':' + rest.length + ':' + Array.isArray(rest);
}
console.log(sum(1, 2, 3), sum());
console.log(tag('a', 1, 2), tag('b'));
console.log(sum.length, tag.length);
