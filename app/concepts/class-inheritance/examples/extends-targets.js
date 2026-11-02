function Legacy(name) { this.name = name; }
Legacy.prototype.hello = function () { return 'hi ' + this.name; };
class Modern extends Legacy {}
console.log(new Modern('Kim').hello());
try { class Bad extends 42 {} } catch (e) { console.log(e.name); }
const arrow = () => {};
try { class Bad2 extends arrow {} } catch (e) { console.log(e.name); }
console.log(Object.getPrototypeOf(class extends null {}.prototype) === null);
