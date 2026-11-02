var sparse = [1, , 3];
var visited = 0;
sparse.forEach(() => { visited += 1; });
var mapped = sparse.map((n) => n * 2);
console.log(visited, mapped.length, 1 in mapped, JSON.stringify(mapped));
var filled = sparse.toSorted();
console.log(filled.length, 1 in filled, 2 in filled);
var sum = (total, n) => total + n;
console.log([1, 2, 3].reduce(sum), [1, 2, 3].reduce(sum, 10));
try { console.log([].reduce(sum)); } catch (e) { console.log(e.name); }
console.log([].reduce(sum, 0), [5].reduce(() => 'never'));
