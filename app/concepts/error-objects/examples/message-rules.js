const none = new Error();
console.log(Object.hasOwn(none, 'message'), JSON.stringify(none.message));
console.log(Object.hasOwn(new Error(undefined), 'message'));
console.log(Object.hasOwn(new Error(''), 'message'));
const num = new Error(42);
console.log(typeof num.message, num.message);
console.log(new Error(null).message);
