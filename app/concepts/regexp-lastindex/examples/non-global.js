var re = /a/;
re.lastIndex = 3;
console.log(re.test('a'), re.lastIndex);
var m = re.exec('banana');
console.log(m.index, re.lastIndex);
