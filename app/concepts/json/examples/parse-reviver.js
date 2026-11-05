var text = '{"title":"standup","at":"2026-11-05T09:30:00.000Z","draft":true,"tags":["daily"]}';
var visited = [];
var meeting = JSON.parse(text, function (key, value) {
  visited.push(key);
  if (key === 'at') return new Date(value);
  if (key === 'draft') return undefined;
  return value;
});
console.log(meeting.at instanceof Date, meeting.at.getUTCHours(), 'draft' in meeting);
console.log(JSON.stringify(visited));
console.log(JSON.parse('42'), JSON.parse('"42"') === '42', JSON.parse('null') === null);
