class ValidationError extends Error {}
console.log(new ValidationError('m', { cause: 1 }).cause);

class FieldError extends Error {
  constructor(field) {
    super('invalid ' + field);
  }
}
const f = new FieldError('age', { cause: 1 });
console.log(f.message, 'cause' in f);

class ForwardingError extends Error {
  constructor(field, options) {
    super('invalid ' + field, options);
  }
}
console.log(new ForwardingError('age', { cause: 1 }).cause);
