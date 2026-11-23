var src = [1, 2, 3];
var mapped = src.map((x, i) => {
  if (i === 0) src[2] = 30;
  src.push(0);
  return x * 10;
});
console.log(JSON.stringify(mapped), src.length);
var items = [1, 2, 3];
var kept = items.filter((x, i) => {
  items[i] = 0;
  return true;
});
console.log(JSON.stringify(kept), JSON.stringify(items));
