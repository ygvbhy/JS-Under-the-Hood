class AssignedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'Assigned';
  }
}
class ProtoError extends Error {}
ProtoError.prototype.name = 'Proto';

const a = new AssignedError('a');
const p = new ProtoError('p');
console.log(String(a), String(p));
console.log(Object.hasOwn(a, 'name'), Object.hasOwn(p, 'name'));
console.log(Object.getOwnPropertyDescriptor(ProtoError.prototype, 'name').enumerable);
console.log(JSON.stringify(a), JSON.stringify(p));
