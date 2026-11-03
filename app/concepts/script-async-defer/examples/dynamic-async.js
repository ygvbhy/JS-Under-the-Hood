var slow = document.createElement('script');
slow.src = '/slow.js';
var fast = document.createElement('script');
fast.src = '/fast.js';
console.log(slow.async, fast.async);
document.head.append(slow, fast);
