var nested = [1, [2, [3, [4]]]];
console.log(JSON.stringify(nested.flat()), JSON.stringify(nested.flat(2)));
console.log(JSON.stringify(nested.flat(Infinity)), JSON.stringify([1, , [2, , 3]].flat()));
console.log(JSON.stringify([1, 2].map((x) => [x, x * 10])));
console.log(JSON.stringify([1, 2].flatMap((x) => [x, [x * 10]])));
console.log(JSON.stringify([1, 2, 3].flatMap((x) => (x % 2 ? [x] : []))));
