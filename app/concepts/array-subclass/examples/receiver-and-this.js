class MyArr extends Array {}
const mine = MyArr.of(1, 2);
console.log(mine.concat([0]) instanceof MyArr);
console.log([0].concat(mine) instanceof MyArr);
console.log(Array.from(mine) instanceof MyArr);
console.log(MyArr.from([0]) instanceof MyArr);
