const re = /([0-9])/g;
re.lastIndex = 3;
console.log(JSON.stringify('a1b2c'.split(re)));
console.log(re.lastIndex);
console.log(JSON.stringify('a1b2c'.split(/[0-9]/)));
console.log(JSON.stringify('a1b2c'.split(re, 2)));
