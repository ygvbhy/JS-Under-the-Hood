var text = 'a😀b';
var parts = [];
for (var ch of text) parts.push(ch.length);
console.log(text.length, parts.length, JSON.stringify(parts));
