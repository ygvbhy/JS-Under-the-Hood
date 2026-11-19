const list = [30n, 4n, 100n];
console.log(list.slice().sort().join());
try {
  list.slice().sort((x, y) => x - y);
} catch (e) {
  console.log(e.name);
}
const d = list[0] - list[1];
console.log(typeof d, String(d));
console.log(list.slice().sort((x, y) => Number(x - y)).join());
const mixed = [3n, 1, 2n];
console.log(mixed.slice().sort((x, y) => (x > y ? 1 : x < y ? -1 : 0)).join());
