const add = {};
const get = {};
for (let i = 0; i < 2; i++) {
  add[i] = function () { i += 10; };
  get[i] = function () { return i; };
}
add[0]();
console.log(get[0](), get[1]());
