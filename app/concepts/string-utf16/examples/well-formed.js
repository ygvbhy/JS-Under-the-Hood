var smile = '😀';
var half = smile.slice(0, 1);
console.log(smile.isWellFormed(), half.isWellFormed());
console.log(JSON.stringify(half.toWellFormed()), half.toWellFormed().length);
console.log(half.toWellFormed().codePointAt(0).toString(16));
