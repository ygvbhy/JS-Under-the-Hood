const dateOnly = new Date('2026-11-10');
const dateTime = new Date('2026-11-10T00:00');
console.log(dateOnly.getTime() === Date.UTC(2026, 10, 10));
console.log(dateTime.getTime() === new Date(2026, 10, 10).getTime());
console.log(dateTime - dateOnly === dateTime.getTimezoneOffset() * 60000);
console.log(dateOnly.getUTCDate(), dateTime.getDate());
