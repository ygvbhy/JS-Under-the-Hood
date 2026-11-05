var p1 = new Promise(function (resolve) {
  console.log('executor');
  resolve(1);
});
var p2 = p1.then(function (v) {
  console.log('then', v);
  return v + 1;
});
var p3 = p2.then(function (v) {
  throw new Error('bad ' + v);
});
var p4 = p3.catch(function (e) {
  console.log('catch', e.message);
});
console.log('sync end', p1 === p2);
