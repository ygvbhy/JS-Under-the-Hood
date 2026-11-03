var slow = document.createElement('script');
slow.src = '/slow.js';
slow.async = false;
var fast = document.createElement('script');
fast.src = '/fast.js';
fast.async = false;
console.log(slow.async, fast.async);
document.head.append(slow, fast);
