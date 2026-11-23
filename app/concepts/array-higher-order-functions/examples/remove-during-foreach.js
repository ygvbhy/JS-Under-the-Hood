var a = [1, 2, 3];
var seenA = [];
a.forEach((x) => {
  seenA.push(x);
  if (x === 1) a.pop();
});
console.log(JSON.stringify(seenA), a.length);
var b = [1, 2, 3];
var seenB = [];
b.forEach((x) => {
  seenB.push(x);
  if (x === 1) b.shift();
});
console.log(JSON.stringify(seenB), JSON.stringify(b));
