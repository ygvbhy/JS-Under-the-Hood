var fruits = ['apple', 'banana'];
console.log(typeof fruits, Array.isArray(fruits));
console.log(JSON.stringify(Object.keys(fruits)), fruits['1']);
fruits[4] = 'kiwi';
console.log(fruits.length, 2 in fruits, fruits[2]);
fruits.color = 'red';
console.log(fruits.length, JSON.stringify(Object.keys(fruits)));
