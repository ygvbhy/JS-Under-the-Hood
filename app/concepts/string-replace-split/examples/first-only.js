const text = 'a-b-c';
console.log(text.replace('-', '+'));
console.log(text.replaceAll('-', '+'));
console.log(text.replace(/-/g, '+'));
const dots = 'a.b.c';
console.log(dots.replace('.', '!'));
console.log(dots.replace(/./, '!'));
