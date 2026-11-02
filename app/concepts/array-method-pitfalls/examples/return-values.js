var list = ['a', 'b'];
console.log(list.push('c'), JSON.stringify(list));
console.log(list.pop(), JSON.stringify(list));
var removed = list.splice(0, 1, 'x', 'y');
console.log(JSON.stringify(removed), JSON.stringify(list));
console.log(list.forEach((item) => item + '!'));
