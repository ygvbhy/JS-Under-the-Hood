var original = [3, 1, 2];
var sorted = original.sort();
console.log(sorted === original, JSON.stringify(original));
var reversed = original.reverse();
console.log(reversed === original, JSON.stringify(original));
var part = original.slice(1);
console.log(part === original, JSON.stringify(part), JSON.stringify(original));
var doubled = original.map((n) => n * 2);
console.log(JSON.stringify(doubled), JSON.stringify(original));
