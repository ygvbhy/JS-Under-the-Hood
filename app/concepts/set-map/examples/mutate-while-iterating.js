var queue = new Set([1]);
var visited = [];
for (var n of queue) {
  visited.push(n);
  if (n < 3) queue.add(n + 1);
}
console.log(JSON.stringify(visited), queue.size);
var letters = new Set(['a', 'b', 'c']);
var seen = [];
for (var v of letters) {
  seen.push(v);
  if (v === 'a') letters.delete('b');
}
console.log(JSON.stringify(seen), letters.size);
