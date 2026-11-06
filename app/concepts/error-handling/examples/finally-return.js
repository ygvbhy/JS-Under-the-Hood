function pick() {
  try {
    return 'try';
  } finally {
    return 'finally';
  }
}
console.log(pick());
