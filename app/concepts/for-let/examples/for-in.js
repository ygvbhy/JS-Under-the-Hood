const user = { name: 'Kim', city: 'Seoul' };
const byLet = {};
const byVar = {};
for (const key in user) {
  byLet[key] = function () { return key; };
}
for (var k in user) {
  byVar[k] = function () { return k; };
}
console.log(byLet.name(), byLet.city());
console.log(byVar.name() === byVar.city());
