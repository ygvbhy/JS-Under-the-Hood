const g = /a/g;
g.lastIndex = 2;
console.log('aaa'.replace(g, 'b'));
console.log(g.lastIndex);
const plain = /a/;
plain.lastIndex = 2;
console.log('aaa'.replace(plain, 'b'));
console.log(plain.lastIndex);
