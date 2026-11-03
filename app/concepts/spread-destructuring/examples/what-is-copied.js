var proto = { inherited: 1 };
var obj = Object.create(proto);
obj.own = 2;
Object.defineProperty(obj, 'hidden', { value: 3 });
var copy = { ...obj };
console.log(JSON.stringify(Object.keys(copy)), copy.inherited, 'hidden' in copy);
console.log(JSON.stringify({ ...null }), JSON.stringify({ ...undefined }));
console.log(JSON.stringify({ ...'hi' }), JSON.stringify([...'hi']));
