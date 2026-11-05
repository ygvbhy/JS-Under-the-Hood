async function ok() {
  return 'ok';
}
async function fail() {
  throw new Error('boom');
}
async function badParam(x = missing) {
  return x;
}
var a = ok();
var b = fail();
var c = badParam();
console.log('호출은 모두 끝남');
a.then(function (v) {
  console.log('a 이행: ' + v);
});
b.catch(function (e) {
  console.log('b 거부: ' + e.message);
});
c.catch(function (e) {
  console.log('c 거부: ' + e.name);
});
