var tag = Symbol('tag');
var src = { a: 1, [tag]: 'T' };
Object.defineProperty(src, Symbol('hidden'), { value: 'H', enumerable: false });
var copy = Object.assign({}, src);
console.log(copy[tag], Object.getOwnPropertySymbols(src).length, Object.getOwnPropertySymbols(copy).length);
console.log(JSON.stringify(copy));
console.log(JSON.stringify({ v: Symbol('x'), n: 1 }), JSON.stringify([Symbol('x'), 1]));
