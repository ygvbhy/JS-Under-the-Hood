function tryCompile(code) {
  try {
    new Function(code);
    return 'ok';
  } catch (e) {
    return e.name;
  }
}
console.log(tryCompile('switch (n) { case 0: let x = 1; break; case 1: let x = 2; }'));
console.log(tryCompile('switch (n) { case 0: let x = 1; break; case 1: let y = 2; }'));
console.log(tryCompile('if (n) { let x = 1; } else { let x = 2; }'));
console.log(tryCompile('switch (n) { case 0: const x = 1; break; default: const x = 2; }'));
