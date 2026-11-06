function work() {
  try {
    console.log('try');
    return 'return 값';
  } finally {
    console.log('finally');
  }
}
console.log(work());
