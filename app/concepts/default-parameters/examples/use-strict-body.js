function tryCompile(params, body) {
  try {
    new Function(params, body);
    return 'ok';
  } catch (e) {
    return e.name;
  }
}
console.log(tryCompile('a', "'use strict'; return a;"));
console.log(tryCompile('a = 1', "'use strict'; return a;"));
console.log(tryCompile('a = 1', 'return a;'));
