var log = ''
outer: for (var i = 0; i < 2; i++) {
  for (var j = 0; j < 2; j++) {
    log = log + '[' + i + j + ']'
    break
    outer
  }
}
console.log(log);
