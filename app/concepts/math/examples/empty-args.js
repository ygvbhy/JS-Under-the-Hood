var none = [];
console.log(Math.max(), Math.min());
console.log(Math.max.apply(null, none), Math.min.apply(null, none));
console.log(Math.max(-Infinity) === Math.max());
console.log(Math.max(3, Math.max()), Math.min(3, Math.min()));
