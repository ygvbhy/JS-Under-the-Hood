var profile = { name: 'kim', nickname: undefined, greet: function () {}, id: Symbol('id') };
console.log(JSON.stringify(profile));
var list = ['kim', undefined, function () {}, Symbol('id')];
console.log(JSON.stringify(list));
console.log(typeof JSON.stringify(undefined), typeof JSON.stringify(function () {}), typeof JSON.stringify(Symbol('id')));
console.log(JSON.stringify(null), JSON.stringify({ empty: null }));
