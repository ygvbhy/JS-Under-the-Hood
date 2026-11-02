var composed = '\u00e9';
var decomposed = 'e\u0301';
console.log(composed.length, decomposed.length, composed === decomposed);
console.log(decomposed.normalize() === composed, composed.normalize('NFD').length);
console.log('한'.length, '한'.normalize('NFD').length);
