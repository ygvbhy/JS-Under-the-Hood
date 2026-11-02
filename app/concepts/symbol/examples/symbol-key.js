var id = Symbol('id');
var user = { name: 'Lee', [id]: 1 };
user.id = 2;
console.log(user[id], user.id, user['id']);
console.log(id in user, 'id' in user);
console.log(user['Symbol(id)'], Object.getOwnPropertySymbols(user)[0] === id);
