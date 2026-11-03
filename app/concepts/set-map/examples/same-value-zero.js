var nums = new Set([NaN, NaN, 0, -0]);
console.log(nums.size, nums.has(NaN), NaN === NaN);
var stored = [...nums];
console.log(Object.is(stored[1], 0), Object.is(stored[1], -0));
var m = new Map([[NaN, 'not a number']]);
console.log(m.get(NaN), new Set([1, '1', true, 'true']).size);
