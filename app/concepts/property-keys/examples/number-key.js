const t = { 1: '하나', 1e3: '천' };
console.log(t[1.0], t['1000']);
console.log(t['01'], t['1.0']);
t[0.1 + 0.2] = '근삿값';
console.log(JSON.stringify(t));
