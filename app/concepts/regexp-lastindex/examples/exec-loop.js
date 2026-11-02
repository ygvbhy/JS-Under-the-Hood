var re = /at/g;
var text = 'cat bat';
var m;
while ((m = re.exec(text)) !== null) {
  console.log(m[0], m.index, re.lastIndex);
}
console.log(re.lastIndex);
