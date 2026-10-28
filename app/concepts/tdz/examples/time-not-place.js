function show() {
  return count;
}
try {
  console.log(show());
} catch (e) {
  console.log(e.name);
}
let count = 3;
console.log(show());
