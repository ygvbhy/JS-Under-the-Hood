var pattern = /([a-z])(?<num>[0-9]+)/g;
var results = [...'a1b22'.matchAll(pattern)];
var m = results[1];
console.log(results.length, m[0], m[1], m[2], m.index, m.input, m.groups.num);
console.log(JSON.stringify('a1b22'.match(pattern)));
console.log('index' in 'a1b22'.match(pattern));
