function OldArr() {
  Array.call(this);
}
OldArr.prototype = Object.create(Array.prototype);
OldArr.prototype.constructor = OldArr;
const old = new OldArr();
old.push('a', 'b');
old[5] = 'f';
console.log('old', old instanceof Array, Array.isArray(old), old.length);

class NewArr extends Array {}
const neu = new NewArr();
neu.push('a', 'b');
neu[5] = 'f';
console.log('class', neu instanceof Array, Array.isArray(neu), neu.length);
