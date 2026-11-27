class ValidationError extends Error {}
const v = new ValidationError('bad');
console.log(v.name, v.constructor.name);
console.log(String(v), JSON.stringify(v));
console.log(v instanceof ValidationError, v instanceof Error);
console.log(Object.hasOwn(v, 'name'), Object.hasOwn(ValidationError.prototype, 'name'));
console.log(Object.hasOwn(Error.prototype, 'name'));

class TypeCheckError extends TypeError {}
console.log(new TypeCheckError('t').name);
