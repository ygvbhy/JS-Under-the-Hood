function tryCompile(code) {
  try {
    new Function(code);
    return 'ok';
  } catch (e) {
    return e.name;
  }
}
function check(label, code) {
  console.log(label, tryCompile(code));
}
check('class', 'switch (n) { case 0: class C {} break; case 1: class C {} }');
check('let-class', 'switch (n) { case 0: let C = 1; break; case 1: class C {} }');
check('let-var', 'switch (n) { case 0: let v = 1; break; case 1: var v = 2; }');
check('var-var', 'switch (n) { case 0: var v = 1; break; case 1: var v = 2; }');
check('function', 'switch (n) { case 0: function f() {} break; case 1: function f() {} }');
check('strict-function', "'use strict'; switch (n) { case 0: function f() {} break; case 1: function f() {} }");
