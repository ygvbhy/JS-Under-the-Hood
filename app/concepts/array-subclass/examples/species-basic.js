class MyArr extends Array {}
const nums = MyArr.of(1, 2, 3);
console.log(nums instanceof MyArr);
console.log(nums.map((x) => x * 2) instanceof MyArr);
console.log(nums.filter((x) => x > 1).constructor.name);
console.log(nums.slice(1) instanceof MyArr);
console.log(nums.concat([4]) instanceof MyArr);
