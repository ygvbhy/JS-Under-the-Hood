var values = [1, NaN, 0];
console.log(values.indexOf(NaN), values.includes(NaN));
console.log(values.indexOf(-0), values.includes(-0));
var sparse = [1, , 3];
console.log(sparse.indexOf(undefined), sparse.includes(undefined));
