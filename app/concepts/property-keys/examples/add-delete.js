const box = { a: 1 };
console.log(box.b);
box.b = 2;
box.a = 10;
console.log(JSON.stringify(box));
console.log(delete box.a);
console.log(box.a);
console.log(delete box.c);
console.log(JSON.stringify(box));
