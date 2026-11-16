var single = 'JS';
var double = "JS";
var backtick = `JS`;
console.log(single === double, double === backtick);
console.log(typeof backtick);
var lines = `a
b`;
console.log(lines === 'a\nb');
var n = 2;
console.log(`${n} + 1 = ${n + 1}`);
