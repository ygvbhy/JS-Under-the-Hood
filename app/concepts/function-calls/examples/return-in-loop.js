function firstMultiple(start, n) {
  for (let i = start; i <= start + 10; i++) {
    if (i % n === 0) {
      return i;
    }
    console.log(i + ' 아님');
  }
  return '없음';
}
function label(code) {
  switch (code) {
    case 1:
      return '하나';
    case 2:
      return '둘';
  }
  return '모름';
}
console.log(firstMultiple(5, 4));
console.log(label(2), label(3));
