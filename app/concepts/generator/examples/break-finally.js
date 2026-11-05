function* naturals() {
  var n = 1;
  try {
    while (true) {
      yield n++;
    }
  } finally {
    console.log('finally');
  }
}
for (var x of naturals()) {
  console.log(x);
  if (x === 3) {
    break;
  }
}
console.log('루프 뒤');
