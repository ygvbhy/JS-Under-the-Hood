var base = { greet() { return 'base'; } };
var child = {
  greet() { return super.greet() + '+child'; },
  later() { var inner = () => super.greet(); return inner(); }
};
Object.setPrototypeOf(child, base);
console.log(child.greet(), child.later());
var borrowed = { greet: child.greet };
console.log(borrowed.greet());
