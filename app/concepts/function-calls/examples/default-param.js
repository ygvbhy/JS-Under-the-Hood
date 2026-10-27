function order(item, count = 1) {
  return item + ' ' + count + '개';
}
console.log(order('사과', 3));
console.log(order('사과'));
console.log(order('사과', undefined));
console.log(order('사과', null));
console.log(order('사과', 0));
