class MyArr extends Array {}
const plain = [1, 2];
plain.constructor = MyArr;
console.log(plain.map((x) => x) instanceof MyArr);
const mine = MyArr.of(1, 2);
mine.constructor = Array;
console.log(mine.map((x) => x) instanceof MyArr);
console.log(MyArr[Symbol.species] === MyArr);
console.log(MyArr.hasOwnProperty(Symbol.species), Array.hasOwnProperty(Symbol.species));
