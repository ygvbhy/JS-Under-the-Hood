const e = Error('x');
console.log(e instanceof Error, Object.getPrototypeOf(e) === Error.prototype, String(e));
console.log(String(RangeError('r')));
class ValidationError extends Error {}
try {
  ValidationError('x');
} catch (err) {
  console.log(err.name);
}
