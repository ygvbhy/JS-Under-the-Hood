var sparse = [1, , 3];
var keys = [];
for (var key in sparse) keys.push(key);
console.log(JSON.stringify(keys), JSON.stringify(Object.keys(sparse)));
console.log(JSON.stringify(sparse), JSON.stringify([1, undefined, 3]));
