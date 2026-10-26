function check(label, value) {
  console.log('평가: ' + label);
  return value;
}

const x = check('A', 0) && check('B', 1);
console.log(x);
const y = check('C', 'ok') || check('D', 2);
console.log(y);
const z = check('E', 1) && check('F', 2);
console.log(z);
