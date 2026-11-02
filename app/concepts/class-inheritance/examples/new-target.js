class Base { constructor() { console.log(new.target.name); } }
class Derived extends Base {}
new Base();
new Derived();
