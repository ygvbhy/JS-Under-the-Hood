function nameOf(value) {
  try {
    structuredClone(value);
    return 'no error';
  } catch (e) {
    return e.name;
  }
}
console.log(nameOf({ name: 'x', greet() {} }), nameOf({ id: Symbol('s') }), nameOf(document.body));
try {
  structuredClone({ f() {} });
} catch (e) {
  console.log(e instanceof DOMException);
}
