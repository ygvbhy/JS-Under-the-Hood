var total = 10;

function report() {
  console.log(total);
  var total = 20;
  console.log(total);
}

report();
console.log(total);
