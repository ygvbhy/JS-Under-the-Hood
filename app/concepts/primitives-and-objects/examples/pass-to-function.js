function change(obj, num) {
  obj.n = 99;
  num = 99;
  obj = { n: 0 };
}

const o = { n: 1 };
let x = 1;
change(o, x);
console.log(o.n, x);
