var m = new Map();
m.set('a', 1);
m.b = 2;
console.log(m.size, m.has('b'), m.get('b'), m.b);
console.log(JSON.stringify(m), JSON.stringify(Object.keys(m)));
var fromObj = new Map(Object.entries({ x: 1, y: 2 }));
var toObj = Object.fromEntries(fromObj);
console.log(fromObj.get('x'), JSON.stringify(toObj));
console.log(JSON.stringify([...m]));
