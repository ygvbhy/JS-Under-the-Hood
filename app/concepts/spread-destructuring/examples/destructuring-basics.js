var point = [10, 20, 30];
var [x, , z] = point;
console.log(x, z);
var user = { name: 'Kim', age: 30 };
var { name, age: years, email } = user;
console.log(name, years, email);
var { address: { city } } = { address: { city: 'Seoul' } };
console.log(city);
