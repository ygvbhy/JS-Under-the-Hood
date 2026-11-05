var meeting = { title: 'standup', at: new Date(Date.UTC(2026, 10, 5, 9, 30)) };
var text = JSON.stringify(meeting);
console.log(text);
var restored = JSON.parse(text);
console.log(typeof restored.at, restored.at instanceof Date);
console.log(typeof Date.prototype.toJSON, JSON.stringify({ at: new Date(NaN) }));
