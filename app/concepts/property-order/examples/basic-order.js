const book = {};
book.title = 'JS';
book[2] = 'two';
book.author = 'Kim';
book[1] = 'one';
console.log(JSON.stringify(Object.keys(book)));
const literal = { title: 'JS', 2: 'two', author: 'Kim', 1: 'one' };
console.log(JSON.stringify(Object.keys(literal)));
