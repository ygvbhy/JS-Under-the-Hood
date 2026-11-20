var a = [1, 2];
console.log(a.valueOf() === a);
console.log(JSON.stringify(a + 1), JSON.stringify([] + []), JSON.stringify([] + {}));
console.log([5] * 2, [1] == 1, [] == ![]);
console.log(new Number(5) + 1, new String('hi') == 'hi');
