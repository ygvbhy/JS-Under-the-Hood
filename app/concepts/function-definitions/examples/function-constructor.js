var x = 'global';
function outer() {
  var x = 'local';
  let y = 1;
  var viaExpr = function () {
    return x;
  };
  var viaCtor = new Function('return x');
  var viaCtorY = new Function('return typeof y');
  console.log(viaExpr());
  console.log(viaCtor());
  console.log(viaCtorY());
}
outer();
