var three = new Array(3);
console.log(three.length, 0 in three, JSON.stringify(Object.keys(three)));
console.log(JSON.stringify(new Array(3, 4)), JSON.stringify(new Array('3')));
console.log(JSON.stringify(Array.of(3)), Array(3).length);
try { new Array(-1); } catch (e) { console.log(e.name); }
