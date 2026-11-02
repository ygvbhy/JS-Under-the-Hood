var re = /x*/g;
var m = re.exec('abc');
console.log(JSON.stringify(m[0]), m.index, re.lastIndex);
m = re.exec('abc');
console.log(JSON.stringify(m[0]), m.index, re.lastIndex);
console.log(JSON.stringify('abc'.match(/x*/g)));
var found = 0;
while ((m = re.exec('abc')) !== null) {
  found++;
  if (m[0] === '') re.lastIndex++;
}
console.log(found, re.lastIndex);
