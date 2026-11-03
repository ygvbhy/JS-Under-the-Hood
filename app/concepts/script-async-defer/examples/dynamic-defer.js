var slow = document.createElement('script');
slow.src = '/slow.js';
slow.defer = true;
var fast = document.createElement('script');
fast.src = '/fast.js';
fast.defer = true;
console.log(slow.async, slow.defer, fast.async, fast.defer);
document.head.append(slow, fast);
