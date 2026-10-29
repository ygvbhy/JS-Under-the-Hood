const empty = null;
let missing;
try {
  empty.length;
} catch (e) {
  console.log(e.name);
}
try {
  missing.length;
} catch (e) {
  console.log(e.name);
}
console.log(empty?.length);
console.log(missing?.length);
