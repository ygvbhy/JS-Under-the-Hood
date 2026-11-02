var secret = Symbol('secret');
var box = { label: 'box', [secret]: 42 };
var names = [];
for (var key in box) names.push(key);
console.log(JSON.stringify(names), JSON.stringify(Object.keys(box)));
console.log(JSON.stringify(box), JSON.stringify(Object.getOwnPropertyNames(box)));
var found = Object.getOwnPropertySymbols(box);
console.log(found.length, found[0] === secret, box[found[0]]);
console.log(Object.getOwnPropertyDescriptor(box, secret).enumerable);
