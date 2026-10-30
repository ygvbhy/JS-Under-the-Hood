let read;
for (let i = 0, first = function () { return i; }; i < 3; i++) {
  read = first;
}
console.log(read());
