var nums = [10, 20, 30, 40];
nums.length = 2;
console.log(JSON.stringify(nums), 2 in nums);
nums.length = 4;
console.log(nums.length, 2 in nums, nums[2]);
nums[3] = 40;
console.log(JSON.stringify(Object.keys(nums)));
