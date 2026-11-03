var queue = [1, 2];
var seen = [];
for (var x of queue) {
  seen.push(x);
  if (x < 3) queue.push(x + 2);
}
console.log(JSON.stringify(seen), queue.length);
var holes = [];
for (var h of [1, , 3]) holes.push(String(h));
console.log(holes.join(','));
