var word = 'cat';
word[0] = 'b';
console.log(word, word[0]);
console.log(JSON.stringify(Object.getOwnPropertyDescriptor(word, 0)));
var upper = word.toUpperCase();
console.log(word, upper);
