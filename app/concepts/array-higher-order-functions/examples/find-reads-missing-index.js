var a = [1, , 3];
var seenA = [];
a.find((x, i) => {
  seenA.push(i + ':' + x);
});
console.log(seenA.join(' '));
var b = [1, 2, 3];
var seenB = [];
b.find((x) => {
  seenB.push(String(x));
  if (x === 1) b.pop();
});
console.log(seenB.join(' '));
