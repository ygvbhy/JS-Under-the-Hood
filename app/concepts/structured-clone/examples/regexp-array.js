const re = /a/g;
re.lastIndex = 2;
const re2 = structuredClone(re);
console.log(re2.flags, re2.lastIndex);
const arr = [1, , 3];
arr.extra = 'x';
const arr2 = structuredClone(arr);
console.log(1 in arr2, arr2.length, arr2.extra);
