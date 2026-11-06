function reassign() {
  var o = { v: 1 };
  try {
    return o;
  } finally {
    o = { v: 2 };
  }
}
function mutate() {
  var o = { v: 1 };
  try {
    return o;
  } finally {
    o.v = 2;
  }
}
console.log(reassign().v);
console.log(mutate().v);
