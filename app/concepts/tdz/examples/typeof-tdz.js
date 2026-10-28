console.log(typeof missing);
try {
  console.log(typeof later);
} catch (e) {
  console.log(e.name);
}
let later = 1;
console.log(typeof later);
