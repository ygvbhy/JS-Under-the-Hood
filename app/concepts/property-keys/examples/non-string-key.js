const m = {};
m[true] = '참';
m[null] = '없음';
m[{}] = '빈 객체';
console.log(m['true'], m['null']);
console.log(m['[object Object]']);
console.log(m[{ a: 1 }]);
console.log(JSON.stringify(m));
