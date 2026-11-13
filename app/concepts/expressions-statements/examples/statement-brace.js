var a = 'outer';
{ a: 1 }
console.log(a);
{ a = 'block'; }
console.log(a);
