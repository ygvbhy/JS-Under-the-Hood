var sticky = /a/y;
console.log(sticky.test('ba'), sticky.lastIndex);
sticky.lastIndex = 1;
console.log(sticky.test('ba'), sticky.lastIndex);
console.log(sticky.test('ba'), sticky.lastIndex);
var globalA = /a/g;
console.log(globalA.test('ba'), globalA.lastIndex);
