var o = {
  valueOf() {
    return 1;
  },
  toString() {
    return 'two';
  },
};
var box = {};
box[o] = true;
console.log(+o, o * 1, o > 0);
console.log(o == 1, o == 'two');
console.log(String(o), Object.keys(box)[0]);
