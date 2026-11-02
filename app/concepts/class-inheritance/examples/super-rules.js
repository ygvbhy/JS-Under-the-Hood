class Base {}
class NoSuper extends Base { constructor() {} }
class Twice extends Base { constructor() { super(); super(); } }
try { new NoSuper(); } catch (e) { console.log(e.name); }
try { new Twice(); } catch (e) { console.log(e.name); }
