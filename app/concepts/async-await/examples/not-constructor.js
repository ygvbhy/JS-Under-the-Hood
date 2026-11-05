async function f() {}
console.log('prototype' in f);
try {
  new f();
} catch (e) {
  console.log('new: ' + e.name);
}
