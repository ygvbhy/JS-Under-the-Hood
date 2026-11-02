var arr = [1, 2, 3];
console.log(JSON.stringify(Object.getOwnPropertyDescriptor(arr, 'length')));
try { arr.length = -1; } catch (e) { console.log(e.name); }
try { arr.length = 1.5; } catch (e) { console.log(e.name); }
var like = { 0: 'a', 1: 'b', length: 2 };
like[5] = 'c';
console.log(like.length, Array.isArray(like));
