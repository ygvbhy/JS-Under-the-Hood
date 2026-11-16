function tryCompile(params, body) {
  try {
    new Function(params, body);
    return 'ok';
  } catch (e) {
    return e.name;
  }
}
function check(name, params, body) {
  console.log(name, tryCompile(params, body), tryCompile(params, "'use strict'; " + body));
}
check('delete-identifier', '', 'var v = 1; delete v;');
check('with', '', 'with ({}) {}');
check('duplicate-params', 'a, a', 'return a;');
check('legacy-octal', '', 'return 010;');
check('assign-eval', '', 'eval = 1;');
check('assign-arguments', '', 'arguments = 1;');
check('let-name', '', 'var let = 1;');
check('implements-name', '', 'var implements = 1;');
