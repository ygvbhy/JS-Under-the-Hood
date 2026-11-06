function none(a, b) {}
function last(a, b = 1) {}
function first(a = 1, b) {}
function middle(a, b = 1, c) {}
function rest(a, ...others) {}
console.log(none.length, last.length, first.length);
console.log(middle.length, rest.length);
