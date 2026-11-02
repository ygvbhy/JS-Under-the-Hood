class Animal {
  constructor(name) {
    this.name = name;
  }
}
class Dog extends Animal {
  constructor(name) {
    this.kind = 'dog';
    super(name);
  }
}
try {
  new Dog('Rex');
} catch (e) {
  console.log(e.name);
}
