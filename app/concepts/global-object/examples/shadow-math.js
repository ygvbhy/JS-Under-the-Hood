try {
  console.log(Math.max(1, 2));
} catch (e) {
  console.log(e.name);
}
let Math = 'mine';
console.log(Math);
console.log(globalThis.Math.max(1, 2));
