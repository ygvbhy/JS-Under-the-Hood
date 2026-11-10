const epoch = new Date(0);
console.log(epoch.toISOString());
const oneDay = new Date(24 * 60 * 60 * 1000);
console.log(oneDay.toISOString());
const days = (new Date(Date.UTC(2026, 2, 1)) - new Date(Date.UTC(2026, 1, 1))) / 86400000;
console.log(days);
