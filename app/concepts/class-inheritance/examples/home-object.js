class Parent { who() { return 'Parent'; } }
class Child extends Parent { who() { return super.who() + '>Child'; } }
const other = { who() { return 'Other'; } };
const borrowed = Object.create(other);
borrowed.who = Child.prototype.who;
console.log(borrowed.who());
