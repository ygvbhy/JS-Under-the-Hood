var numbers = [10, 9, 1];
console.log(JSON.stringify(numbers.sort()));
console.log(JSON.stringify([-1, -2, 3].sort()));
console.log(JSON.stringify([10, 9, 1].sort((a, b) => a - b)));
console.log(JSON.stringify(['b', 'B', 'a'].sort()));
