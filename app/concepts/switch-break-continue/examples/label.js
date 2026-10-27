outer: for (let a = 1; a <= 3; a++) {
  for (let b = 1; b <= 3; b++) {
    if (a * b === 4) break outer;
    console.log(a, b);
  }
}
console.log('끝');
