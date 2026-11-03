var { a = 'D', b = 'D', c = 'D', d = 'D' } = { a: undefined, b: null, c: 0 };
console.log(a, b, c, d);
var [e = 'D', f = 'D'] = [undefined, null];
console.log(e, f);
var { g = 'D' } = { g: '' };
console.log(JSON.stringify(g), JSON.stringify('' || 'D'), JSON.stringify(null ?? 'D'));
