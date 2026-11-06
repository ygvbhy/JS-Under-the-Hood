let calls = 0;
function nextId() {
  calls = calls + 1;
  return calls;
}
function tag(id = nextId()) {
  return id;
}
console.log(tag(), tag(), tag(100), tag(null), tag());
console.log(calls);
