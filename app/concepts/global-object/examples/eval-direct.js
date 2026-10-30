var where = 'global';
function read() {
  var where = 'local';
  console.log(eval('where'));
  console.log((0, eval)('where'));
}
read();
