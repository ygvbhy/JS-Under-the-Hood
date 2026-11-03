var tags = new Set(['js', 'css', 'js']);
tags.add('html').add('css');
console.log(tags.size, tags.has('css'), tags.delete('css'), tags.size);
var ages = new Map([['kim', 30]]);
ages.set('lee', 25).set('kim', 31);
console.log(ages.size, ages.get('kim'), ages.get('park'), ages.has('lee'));
console.log(JSON.stringify([...tags]), JSON.stringify([...ages]));
