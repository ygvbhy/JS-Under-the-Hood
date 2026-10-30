function Legacy() {}
Legacy.prototype.make = function () {};
class Modern { make() {} }
console.log(typeof new Legacy.prototype.make());
try { new Modern.prototype.make(); } catch (e) { console.log(e.name); }
console.log(Object.getOwnPropertyDescriptor(Modern, 'prototype').writable, Object.getOwnPropertyDescriptor(Legacy, 'prototype').writable);
