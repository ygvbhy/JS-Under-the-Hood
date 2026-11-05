var viaForEach = [];
[1, 2, 3].forEach(async function (x) {
  await null;
  viaForEach.push(x);
});
console.log('forEach 직후: ' + JSON.stringify(viaForEach));
async function viaForOf() {
  var done = [];
  for (var x of [1, 2, 3]) {
    await null;
    done.push(x);
  }
  return done;
}
viaForOf().then(function (done) {
  console.log('for...of: ' + JSON.stringify(done));
  console.log('forEach 나중: ' + JSON.stringify(viaForEach));
});
