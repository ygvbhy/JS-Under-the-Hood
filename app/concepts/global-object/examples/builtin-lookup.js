console.log(Math === globalThis.Math);
console.log(parseInt === globalThis.parseInt);
console.log(this === globalThis);
globalThis.answer = 42;
console.log(answer);
