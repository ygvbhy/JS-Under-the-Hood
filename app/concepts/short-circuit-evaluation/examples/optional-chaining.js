const user = { profile: { age: 30 } };
const guest = null;

console.log(user?.profile.age);
console.log(guest?.profile.age);
console.log(guest?.profile.age ?? '나이 정보 없음');
