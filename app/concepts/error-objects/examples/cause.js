const withCause = new Error('m', { cause: 1 });
console.log(withCause.cause, JSON.stringify(withCause));
console.log('cause' in new Error('m'));
console.log(Object.hasOwn(new Error('m', {}), 'cause'));
const undef = new Error('m', { cause: undefined });
console.log(Object.hasOwn(undef, 'cause'), undef.cause);
const inherited = new Error('m', Object.create({ cause: 3 }));
console.log(inherited.cause, Object.hasOwn(inherited, 'cause'));
