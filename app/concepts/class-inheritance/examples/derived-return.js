class Base {}
class ReturnsObject extends Base { constructor() { return { custom: true }; } }
class ReturnsNumber extends Base { constructor() { super(); return 1; } }
console.log(JSON.stringify(new ReturnsObject()), new ReturnsObject() instanceof ReturnsObject);
try { new ReturnsNumber(); } catch (e) { console.log(e.name); }
