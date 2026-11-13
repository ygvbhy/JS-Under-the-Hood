var re = /(?=[0-9])/g;
re.lastIndex = 2;
var it = 'a1b2c3'.matchAll(re);
re.lastIndex = 0;
for (var m of it) {
  console.log(JSON.stringify(m[0]), m.index);
}
console.log(re.lastIndex);
