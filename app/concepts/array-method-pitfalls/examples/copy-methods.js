var scores = [30, 10, 20];
var asc = scores.toSorted((a, b) => a - b);
console.log(JSON.stringify(asc), JSON.stringify(scores));
console.log(JSON.stringify(scores.toReversed()), JSON.stringify(scores.toSpliced(0, 1)));
console.log(JSON.stringify(scores.with(-1, 99)), JSON.stringify(scores));
try { console.log(JSON.stringify(scores.with(3, 0))); } catch (e) { console.log(e.name); }
var users = [{ name: 'kim' }];
var copy = users.toReversed();
copy[0].name = 'lee';
console.log(copy === users, users[0].name);
