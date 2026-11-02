var double = n => n * 2;
var add = (a, b) => a + b;
var noReturn = (a, b) => { a + b; };
var withReturn = (a, b) => { return a + b; };
console.log(double(4), add(2, 3), noReturn(2, 3), withReturn(2, 3));
var label = () => { value: 1 };
var object = () => ({ value: 1 });
console.log(label(), JSON.stringify(object()));
