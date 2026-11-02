var mixed = [3, undefined, , 1];
mixed.sort();
console.log(mixed.length, JSON.stringify(mixed), 2 in mixed, 3 in mixed);
var called = 0;
[undefined, 2, 1].sort((a, b) => { called += a === undefined || b === undefined ? 1 : 0; return a - b; });
console.log(called);
var people = [
  { name: 'A', age: 30 },
  { name: 'B', age: 20 },
  { name: 'C', age: 30 },
  { name: 'D', age: 20 },
];
people.sort((x, y) => x.age - y.age);
console.log(people.map((p) => p.name).join(''));
