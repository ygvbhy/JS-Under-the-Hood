const csv = 'a,b,,c';
console.log(JSON.stringify(csv.split(',')));
console.log(JSON.stringify(csv.split(',', 2)));
console.log(JSON.stringify(csv.split(',', 0)));
console.log(JSON.stringify(csv.split()));
console.log(JSON.stringify(''.split(',')));
console.log(JSON.stringify(''.split('')));
