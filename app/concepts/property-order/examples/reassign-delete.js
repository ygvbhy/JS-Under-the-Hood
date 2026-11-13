const user = { name: 'Lee', age: 20, city: 'Seoul' };
user.name = 'Park';
console.log(JSON.stringify(Object.keys(user)));
delete user.name;
user.name = 'Choi';
console.log(JSON.stringify(Object.keys(user)));
