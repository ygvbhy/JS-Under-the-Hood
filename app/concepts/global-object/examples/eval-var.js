function run() {
  eval('var made = 1');
  eval('let kept = 2');
  console.log(typeof made, typeof kept);
}
run();
console.log(typeof made);
