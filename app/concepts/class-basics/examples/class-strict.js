function Legacy() {}
Legacy.prototype.self = function () { return this; };
class Modern { self() { return this; } }
var a = new Legacy().self;
var b = new Modern().self;
console.log(a() === globalThis, b());
class Counter { start() { total = 0; } }
try { new Counter().start(); } catch (e) { console.log(e.name, typeof total); }
