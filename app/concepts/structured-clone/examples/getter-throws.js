function nameOf(value) {
  try {
    structuredClone(value);
    return 'no error';
  } catch (e) {
    return e.name;
  }
}
try {
  structuredClone({
    get g() {
      throw new RangeError('boom');
    },
    f() {},
  });
} catch (e) {
  console.log(e.name, e instanceof DOMException);
}
console.log(
  nameOf({
    f() {},
    get g() {
      throw new RangeError('boom');
    },
  }),
);
