function countdown(n) {
  if (n === 0) {
    return 'done';
  }
  const result = countdown(n - 1);
  console.log(n);
  return result;
}
console.log(countdown(3));
