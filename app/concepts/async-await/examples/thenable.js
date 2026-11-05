var thenable = {
  then: function (resolve) {
    console.log('then 호출됨');
    resolve(7);
  }
};
async function read() {
  var v = await thenable;
  console.log('v = ' + v);
}
read();
console.log('sync end');
