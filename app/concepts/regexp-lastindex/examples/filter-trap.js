var startsWithA = /^a/g;
var words = ['apple', 'avocado', 'banana', 'apricot'];
var picked = words.filter((w) => startsWithA.test(w));
console.log(JSON.stringify(picked), startsWithA.lastIndex);
var noFlag = /^a/;
console.log(JSON.stringify(words.filter((w) => noFlag.test(w))));
