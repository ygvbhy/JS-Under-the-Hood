var re = /an/g;
re.lastIndex = 4;
var all = 'banana'.match(re);
console.log(JSON.stringify(all), all.index, re.lastIndex);
var first = 'banana'.match(/an/);
console.log(JSON.stringify(first), first.index);
console.log('xyz'.match(/an/g));
