const scores = {};
scores[1] = '금';
scores['2'] = '은';
console.log(scores['1']);
console.log(scores[2]);
scores['1'] = '동';
console.log(scores[1]);
console.log(JSON.stringify(scores));
