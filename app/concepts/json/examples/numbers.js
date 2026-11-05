var stats = { avg: 0 / 0, max: 1 / 0, min: -1 / 0, zero: -0 };
console.log(JSON.stringify(stats));
console.log(JSON.stringify([NaN, Infinity, -0, 1e21]));
console.log(JSON.stringify([new Number(7), new String('7'), new Boolean(false)]));
var sparse = [1, , 3];
console.log(JSON.stringify(sparse), sparse.length);
