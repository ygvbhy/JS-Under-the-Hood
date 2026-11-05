function* steps() {
  yield 1;
  yield 2;
  return 3;
}
var looped = [];
for (var x of steps()) {
  looped.push(x);
}
console.log(JSON.stringify(looped));
console.log(JSON.stringify([...steps()]));
var it = steps();
it.next();
it.next();
var last = it.next();
console.log(last.value + ' ' + last.done);
